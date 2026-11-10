/** Tipos compartilhados pela API. */

export type Id = number;

/** Conteúdo gravado dentro do JWT. */
export interface AuthPayload {
  sub: Id;
  email: string;
}

export interface PageRequest {
  page: number;
  limit: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Filtro simples por coluna (ex.: listar talhões de uma propriedade). */
export interface QueryFilter {
  column: string;
  value: number;
}
