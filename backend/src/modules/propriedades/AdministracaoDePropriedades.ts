import type { PagedResult, PageRequest } from '../../shared/types';
import type { Propriedade } from './Propriedade';

/** Quem cadastrou a propriedade. Só o administrador enxerga estes dados. */
export interface Responsavel {
  id: number;
  nome: string;
  email: string;
  cpf: string;
}

export interface PropriedadeComResponsavel {
  propriedade: Propriedade;
  responsavel: Responsavel;
}

/** Registro (imutável) de uma troca de responsável, para auditoria. */
export interface Transferencia {
  id: number;
  propriedadeId: number;
  de: Pick<Responsavel, 'id' | 'nome' | 'email'>;
  para: Pick<Responsavel, 'id' | 'nome' | 'email'>;
  realizadaPor: Pick<Responsavel, 'id' | 'nome'>;
  motivo: string;
  realizadaEm: string;
}

export interface NovaTransferencia {
  propriedadeId: number;
  deUsuarioId: number;
  paraUsuarioId: number;
  adminId: number;
  motivo: string;
  /** Retrato da propriedade na hora da troca (o histórico sobrevive à exclusão dela). */
  propriedadeNome: string;
  propriedadeCar: string | null;
}

/**
 * Visão de ADMINISTRADOR sobre todas as propriedades (de todos os usuários) e a troca de responsável.
 * Fica separada do repositório do dono (`ScopedRepository`): quem usa o CRUD normal nunca passa por aqui.
 */
export interface AdministracaoDePropriedades {
  /** Todas as propriedades, com o responsável; `busca` procura em nome, município, CAR, CCIR e dados do responsável. */
  listar(request: PageRequest, busca: string | null): Promise<PagedResult<PropriedadeComResponsavel>>;
  buscarPorId(id: number): Promise<PropriedadeComResponsavel | null>;
  listarTransferencias(propriedadeId: number): Promise<Transferencia[]>;
  /**
   * Troca o responsável e grava o histórico NA MESMA transação (ou faz as duas coisas ou nenhuma).
   * Falha com ConflictError se o responsável atual já não for `deUsuarioId` (duas trocas ao mesmo tempo).
   */
  transferir(transferencia: NovaTransferencia): Promise<void>;
}
