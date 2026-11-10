import type { PagedResult, PageRequest, QueryFilter } from '../types';
import type { Entity } from './Entity';

/**
 * Contrato genérico dos repositórios dos recursos que pertencem a um usuário.
 * Toda leitura recebe `userId`: um usuário nunca enxerga dados de outro.
 */
export interface ScopedRepository<T extends Entity<object>> {
  findPage(userId: number, request: PageRequest, filter: QueryFilter | null): Promise<PagedResult<T>>;
  findById(userId: number, id: number): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: number): Promise<void>;
}
