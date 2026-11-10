import type { PagedResult, PageRequest } from '../../shared/types';
import type { TipoPersonalizado } from './TipoPersonalizado';

/** Repositório dos tipos de atividade criados pelo administrador (valem para todos os usuários). */
export interface TipoPersonalizadoRepository {
  findPage(request: PageRequest): Promise<PagedResult<TipoPersonalizado>>;
  findAll(): Promise<TipoPersonalizado[]>;
  findById(id: number): Promise<TipoPersonalizado | null>;
  findByNome(nome: string): Promise<TipoPersonalizado | null>;
  create(tipo: TipoPersonalizado): Promise<TipoPersonalizado>;
  update(tipo: TipoPersonalizado): Promise<TipoPersonalizado>;
  delete(id: number): Promise<void>;
}

/**
 * Consulta de uso: um tipo que já tem atividades não pode ter a estrutura alterada nem ser excluído.
 * Definida aqui (quem consome); o módulo de atividades é quem a implementa.
 */
export interface UsoDeTipo {
  existeAtividadeComTipo(tipoId: number): Promise<boolean>;
}
