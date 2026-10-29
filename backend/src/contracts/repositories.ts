import type { Entity } from '../entities/Entity';
import type { Usuario } from '../entities/Usuario';
import type { PagedResult, PageRequest, QueryFilter } from '../types';

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

/**
 * Consulta de área já alocada em talhões (Segregação de Interfaces: quem só precisa dessa
 * consulta não depende do CRUD inteiro). O chamador deve ter validado antes que a
 * propriedade pertence ao usuário.
 */
export interface AreaPorPropriedade {
  /** Soma (ha) das áreas dos talhões da propriedade, ignorando um talhão (o que está sendo editado). */
  somaAreas(propriedadeId: number, ignorarTalhaoId: number | null): Promise<number>;
}

export interface UsuarioRepository {
  findById(id: number): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  findByCpf(cpf: string): Promise<Usuario | null>;
  create(usuario: Usuario): Promise<Usuario>;
  update(usuario: Usuario): Promise<Usuario>;
}
