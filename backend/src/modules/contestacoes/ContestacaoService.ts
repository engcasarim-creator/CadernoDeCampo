import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import type { ArmazenamentoDeArquivos } from '../../shared/storage';
import type { Page } from '../../shared/types';
import { BodyReader } from '../../shared/utils/BodyReader';
import { buildPage, parsePageRequest } from '../../shared/utils/pagination';
import {
  normalizarCar,
  normalizarCcir,
  problemaNoCar,
  problemaNoCcir,
  type PropriedadeRegistrada,
  type RegistroDePropriedades,
} from '../propriedades';
import type { Contestacao } from './Contestacao';
import type { ContestacaoRepository, NovoArquivo } from './ContestacaoRepository';
import { nomeSeguro, validarPdfs } from './pdf';

export const JUSTIFICATIVA_MINIMA = 20;

export type ContestacaoPublica = ReturnType<Contestacao['toJSON']>;
export interface ArquivoParaDownload {
  nome: string;
  conteudo: Buffer;
}

/** Lado do SOLICITANTE: abrir o pedido com os PDFs e acompanhar. Cada usuário só enxerga os próprios pedidos. */
export class ContestacaoService {
  constructor(
    private readonly contestacoes: ContestacaoRepository,
    private readonly registro: RegistroDePropriedades,
    private readonly arquivos: ArmazenamentoDeArquivos,
  ) {}

  async abrir(usuarioId: number, corpo: unknown, enviados: readonly Express.Multer.File[]): Promise<ContestacaoPublica> {
    const reader = new BodyReader(corpo);
    const car = normalizarCar(reader.string('car', 60));
    const ccirInformado = reader.optionalString('ccir', 30);
    const ccir = ccirInformado === null ? null : normalizarCcir(ccirInformado);
    const justificativa = reader.string('justificativa', 2000);
    reader.finish();

    const erros: Record<string, string> = {};
    const erroCar = problemaNoCar(car, car.slice(0, 2));
    if (erroCar) erros.car = erroCar;
    const erroCcir = ccir === null ? null : problemaNoCcir(ccir);
    if (erroCcir) erros.ccir = erroCcir;
    if (justificativa.length < JUSTIFICATIVA_MINIMA) {
      erros.justificativa = `Explique com pelo menos ${JUSTIFICATIVA_MINIMA} caracteres como você é o responsável pelo imóvel.`;
    }
    if (Object.keys(erros).length > 0) throw new ValidationError('Dados inválidos. Verifique os campos informados.', erros);
    validarPdfs(enviados);

    const contestada = await this.#localizar(car, ccir);
    if (!contestada) {
      throw new ValidationError('Nenhuma propriedade cadastrada com este CAR/CCIR', {
        car: 'Não há cadastro com este CAR (nem CCIR). Se o imóvel é seu, basta cadastrá-lo normalmente.',
      });
    }
    if (contestada.usuarioId === usuarioId) {
      throw new ConflictError('Esta propriedade já está no seu cadastro', { car: 'Este imóvel já é seu: não há o que contestar.' });
    }
    if (await this.contestacoes.buscarEmAnalise(usuarioId, contestada.id)) {
      throw new ConflictError('Você já tem um pedido em análise para esta propriedade', {
        car: 'Aguarde a decisão do administrador no pedido já aberto.',
      });
    }

    // Chaves geradas aqui (UUID): o nome enviado pelo usuário nunca chega ao disco.
    const novos: NovoArquivo[] = enviados.map((arquivo) => ({
      nomeOriginal: nomeSeguro(arquivo.originalname),
      chave: `${randomUUID()}.pdf`,
      tamanho: arquivo.size,
    }));
    const gravados: string[] = [];
    try {
      for (const [i, novo] of novos.entries()) {
        await this.arquivos.salvar(novo.chave, (enviados[i] as Express.Multer.File).buffer);
        gravados.push(novo.chave);
      }
      const criada = await this.contestacoes.criar(
        { solicitanteId: usuarioId, propriedadeId: contestada.id, car, ccir, justificativa },
        novos,
      );
      return criada.toJSON();
    } catch (error) {
      // Nada de arquivo órfão se o banco recusou o pedido.
      await Promise.all(gravados.map((chave) => this.arquivos.remover(chave).catch(() => undefined)));
      throw error;
    }
  }

  async #localizar(car: string, ccir: string | null): Promise<PropriedadeRegistrada | null> {
    return (await this.registro.buscarPorCar(car)) ?? (ccir === null ? null : await this.registro.buscarPorCcir(ccir));
  }

  async listar(usuarioId: number, query: Record<string, unknown>): Promise<Page<ContestacaoPublica>> {
    const request = parsePageRequest(query);
    const resultado = await this.contestacoes.listarDoSolicitante(usuarioId, request);
    return buildPage({ items: resultado.items.map((c) => c.toJSON()), total: resultado.total }, request);
  }

  async obter(usuarioId: number, id: number): Promise<ContestacaoPublica> {
    return (await this.#doSolicitante(usuarioId, id)).toJSON();
  }

  async baixar(usuarioId: number, id: number, arquivoId: number): Promise<ArquivoParaDownload> {
    return lerArquivo(await this.#doSolicitante(usuarioId, id), arquivoId, this.arquivos);
  }

  /** Pedido de outro usuário responde igual a pedido inexistente (404): nunca confirma que existe. */
  async #doSolicitante(usuarioId: number, id: number): Promise<Contestacao> {
    const contestacao = await this.contestacoes.buscarPorId(id);
    if (!contestacao || !contestacao.pertenceA(usuarioId)) throw new NotFoundError('Contestação não encontrada');
    return contestacao;
  }
}

export async function lerArquivo(
  contestacao: Contestacao,
  arquivoId: number,
  armazenamento: ArmazenamentoDeArquivos,
): Promise<ArquivoParaDownload> {
  const arquivo = contestacao.arquivo(arquivoId);
  if (!arquivo) throw new NotFoundError('Arquivo não encontrado');
  try {
    return { nome: arquivo.nomeOriginal, conteudo: await armazenamento.ler(arquivo.chave) };
  } catch {
    throw new NotFoundError('Arquivo não encontrado no armazenamento');
  }
}
