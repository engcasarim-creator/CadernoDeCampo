import type { Page } from '../../shared/types';
import { NotFoundError, ValidationError } from '../../shared/errors';
import { BodyReader } from '../../shared/utils/BodyReader';
import { buildPage, parsePageRequest } from '../../shared/utils/pagination';
import type { UsuarioRepository } from '../usuarios';
import type {
  AdministracaoDePropriedades,
  PropriedadeComResponsavel,
  Transferencia,
} from './AdministracaoDePropriedades';

const MOTIVO_MINIMO = 10;
const BUSCA_MAXIMA = 100;

/** Visão da propriedade para o administrador: os dados dela + quem é o responsável. */
export type PropriedadeParaAdmin = Record<string, unknown> & { responsavel: PropriedadeComResponsavel['responsavel'] };

export interface DetalheParaAdmin extends PropriedadeParaAdmin {
  transferencias: Transferencia[];
}

const paraAdmin = ({ propriedade, responsavel }: PropriedadeComResponsavel): PropriedadeParaAdmin => ({
  ...propriedade.toJSON(),
  responsavel,
});

/**
 * Resolve o caso "alguém cadastrou primeiro a propriedade de outra pessoa": o administrador encontra a
 * propriedade (por CAR, CCIR, nome...) e transfere o cadastro para o responsável correto, deixando o motivo
 * registrado. Talhões, safras e atividades acompanham a propriedade (pertencem a ela).
 */
export class PropriedadeAdminService {
  constructor(
    private readonly propriedades: AdministracaoDePropriedades,
    private readonly usuarios: Pick<UsuarioRepository, 'findById'>,
  ) {}

  async listar(query: Record<string, unknown>): Promise<Page<PropriedadeParaAdmin>> {
    const request = parsePageRequest(query);
    const texto = typeof query.busca === 'string' ? query.busca.trim().slice(0, BUSCA_MAXIMA) : '';
    const resultado = await this.propriedades.listar(request, texto === '' ? null : texto);
    return buildPage({ items: resultado.items.map(paraAdmin), total: resultado.total }, request);
  }

  async obter(id: number): Promise<DetalheParaAdmin> {
    const encontrada = await this.propriedades.buscarPorId(id);
    if (!encontrada) throw new NotFoundError('Propriedade não encontrada');
    return { ...paraAdmin(encontrada), transferencias: await this.propriedades.listarTransferencias(id) };
  }

  async transferir(adminId: number, id: number, raw: unknown): Promise<DetalheParaAdmin> {
    const reader = new BodyReader(raw);
    const novoUsuarioId = reader.integer('novoUsuarioId');
    const motivo = reader.string('motivo', 255);
    reader.finish();
    if (motivo.length < MOTIVO_MINIMO) {
      throw new ValidationError('Motivo muito curto', {
        motivo: `Explique o motivo com pelo menos ${MOTIVO_MINIMO} caracteres (fica registrado no histórico).`,
      });
    }

    const atual = await this.propriedades.buscarPorId(id);
    if (!atual) throw new NotFoundError('Propriedade não encontrada');
    if (atual.responsavel.id === novoUsuarioId) {
      throw new ValidationError('A propriedade já pertence a este usuário', {
        novoUsuarioId: 'Escolha um usuário diferente do responsável atual',
      });
    }
    if (!(await this.usuarios.findById(novoUsuarioId))) {
      throw new NotFoundError('Usuário de destino não encontrado', { novoUsuarioId: 'Usuário inexistente' });
    }

    const { propriedade } = atual;
    await this.propriedades.transferir({
      propriedadeId: id,
      deUsuarioId: atual.responsavel.id,
      paraUsuarioId: novoUsuarioId,
      adminId,
      motivo,
      propriedadeNome: propriedade.toProps().nome,
      propriedadeCar: propriedade.toProps().car,
    });
    return this.obter(id);
  }
}
