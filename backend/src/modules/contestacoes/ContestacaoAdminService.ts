import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import type { EmailSender } from '../../shared/email';
import type { ArmazenamentoDeArquivos } from '../../shared/storage';
import type { Page } from '../../shared/types';
import { BodyReader } from '../../shared/utils/BodyReader';
import { buildPage, parsePageRequest } from '../../shared/utils/pagination';
import type { AdministracaoDePropriedades, PropriedadeComResponsavel } from '../propriedades';
import { formatarCar } from '../propriedades';
import type { UsuarioRepository } from '../usuarios';
import {
  STATUS_DE_CONTESTACAO,
  type Contestacao,
  type DecisaoDeContestacao,
  type StatusDeContestacao,
} from './Contestacao';
import type { ContestacaoRepository } from './ContestacaoRepository';
import { lerArquivo, type ArquivoParaDownload, type ContestacaoPublica } from './ContestacaoService';
import type { Notificador } from './Notificador';

export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 300;
const DECISOES: readonly DecisaoDeContestacao[] = ['DEFERIDA', 'INDEFERIDA'];

export interface ContestacaoParaAdmin {
  contestacao: ContestacaoPublica;
  solicitante: { id: number; nome: string; email: string; cpf: string } | null;
  /** Propriedade contestada e quem é o responsável hoje; null se ela foi excluída. */
  propriedade: (Record<string, unknown> & { responsavel: PropriedadeComResponsavel['responsavel'] }) | null;
}

/** Lado do ADMINISTRADOR: ler os pedidos e PDFs, decidir e avisar o solicitante (sistema + e-mail). */
export class ContestacaoAdminService {
  constructor(
    private readonly contestacoes: ContestacaoRepository,
    private readonly propriedades: AdministracaoDePropriedades,
    private readonly usuarios: Pick<UsuarioRepository, 'findById'>,
    private readonly arquivos: ArmazenamentoDeArquivos,
    private readonly notificador: Notificador,
    private readonly email: EmailSender,
  ) {}

  async listar(query: Record<string, unknown>): Promise<Page<ContestacaoPublica & { solicitante: string | null }>> {
    const request = parsePageRequest(query);
    const resultado = await this.contestacoes.listarTodas(request, lerStatus(query.status));
    const itens = await Promise.all(
      resultado.items.map(async (c) => ({
        ...c.toJSON(),
        solicitante: (await this.usuarios.findById(c.solicitanteId))?.nome ?? null,
      })),
    );
    return buildPage({ items: itens, total: resultado.total }, request);
  }

  async obter(id: number): Promise<ContestacaoParaAdmin> {
    const contestacao = await this.#buscar(id);
    const solicitante = await this.usuarios.findById(contestacao.solicitanteId);
    const atual = contestacao.propriedadeId === null ? null : await this.propriedades.buscarPorId(contestacao.propriedadeId);
    return {
      contestacao: contestacao.toJSON(),
      solicitante: solicitante
        ? { id: solicitante.id as number, nome: solicitante.nome, email: solicitante.email, cpf: solicitante.cpf }
        : null,
      propriedade: atual ? { ...atual.propriedade.toJSON(), responsavel: atual.responsavel } : null,
    };
  }

  async baixar(id: number, arquivoId: number): Promise<ArquivoParaDownload> {
    return lerArquivo(await this.#buscar(id), arquivoId, this.arquivos);
  }

  /**
   * Decide o pedido. Ordem pensada para nunca deixar o sistema inconsistente:
   *  1. "reserva" a decisão (só passa se ainda estiver EM_ANALISE: duas decisões simultâneas não passam as duas);
   *  2. se DEFERIDA, transfere a propriedade; se a transferência falhar, reabre o pedido e devolve o erro;
   *  3. avisa no sistema e por e-mail (falha de aviso não desfaz a decisão: o status do e-mail fica registrado).
   */
  async decidir(adminId: number, id: number, corpo: unknown): Promise<ContestacaoParaAdmin> {
    const reader = new BodyReader(corpo);
    const decisao = reader.oneOf('decisao', DECISOES);
    const motivo = reader.string('motivo', MOTIVO_MAXIMO);
    reader.finish();
    if (motivo.length < MOTIVO_MINIMO) {
      throw new ValidationError('Motivo muito curto', {
        motivo: `Explique em poucas palavras (mínimo ${MOTIVO_MINIMO} caracteres): o solicitante lê este texto.`,
      });
    }

    const contestacao = await this.#buscar(id);
    if (!contestacao.estaEmAnalise()) throw new ConflictError('Este pedido já foi decidido');
    const solicitante = await this.usuarios.findById(contestacao.solicitanteId);
    if (!solicitante) throw new NotFoundError('Solicitante não encontrado');
    const atual = contestacao.propriedadeId === null ? null : await this.propriedades.buscarPorId(contestacao.propriedadeId);
    if (decisao === 'DEFERIDA' && !atual) {
      throw new ConflictError('A propriedade contestada não existe mais: o pedido só pode ser indeferido', {
        decisao: 'Propriedade excluída. Indefira o pedido informando o motivo.',
      });
    }

    if (!(await this.contestacoes.decidir(id, adminId, decisao, motivo))) {
      throw new ConflictError('Este pedido já foi decidido');
    }
    if (decisao === 'DEFERIDA' && atual && atual.responsavel.id !== contestacao.solicitanteId) {
      try {
        const { propriedade } = atual;
        await this.propriedades.transferir({
          propriedadeId: atual.propriedade.id as number,
          deUsuarioId: atual.responsavel.id,
          paraUsuarioId: contestacao.solicitanteId,
          adminId,
          motivo: `Contestação #${id} deferida: ${motivo}`.slice(0, 255),
          propriedadeNome: propriedade.toProps().nome,
          propriedadeCar: propriedade.toProps().car,
        });
      } catch (error) {
        await this.contestacoes.reabrir(id);
        throw error;
      }
    }

    await this.#avisar(contestacao, solicitante.nome, solicitante.email, decisao, motivo);
    return this.obter(id);
  }

  async #avisar(c: Contestacao, nome: string, email: string, decisao: DecisaoDeContestacao, motivo: string): Promise<void> {
    const resultado = decisao === 'DEFERIDA' ? 'deferido' : 'indeferido';
    const car = formatarCar(c.car);
    const titulo = `Seu pedido de contestação foi ${resultado}`;

    try {
      await this.notificador.notificar(c.solicitanteId, titulo, `Imóvel ${car}. Motivo: ${motivo}`);
    } catch (error) {
      // A decisão já vale e aparece em "Minhas contestações"; só registramos a falha do aviso.
      console.error('Falha ao criar a notificação da contestação:', error instanceof Error ? error.message : error);
    }

    const status = await this.email.enviar({
      para: email,
      assunto: `Caderno de Campo: seu pedido foi ${resultado}`,
      texto:
        `Olá, ${nome}.\n\n` +
        `Seu pedido de contestação #${c.id} sobre o imóvel ${car} foi ${resultado.toUpperCase()}.\n\n` +
        `Motivo: ${motivo}\n\n` +
        (decisao === 'DEFERIDA'
          ? 'A propriedade já está no seu cadastro, com talhões, safras e atividades.\n'
          : 'Se tiver novos documentos, abra um novo pedido pelo sistema.\n'),
    });
    await this.contestacoes.registrarEmail(c.id, status);
  }

  async #buscar(id: number): Promise<Contestacao> {
    const contestacao = await this.contestacoes.buscarPorId(id);
    if (!contestacao) throw new NotFoundError('Contestação não encontrada');
    return contestacao;
  }
}

function lerStatus(valor: unknown): StatusDeContestacao | null {
  if (valor === undefined || valor === '') return null;
  const encontrado = STATUS_DE_CONTESTACAO.find((s) => s === valor);
  if (!encontrado) {
    throw new ValidationError('Filtro inválido', { status: `Use: ${STATUS_DE_CONTESTACAO.join(', ')}` });
  }
  return encontrado;
}
