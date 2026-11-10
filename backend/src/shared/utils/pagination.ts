import { ValidationError } from '../errors';
import type { Page, PagedResult, PageRequest } from '../types';

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

function readPositiveInt(value: unknown, field: string, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError(`Parâmetro "${field}" inválido`, { [field]: 'Deve ser um inteiro positivo' });
  }
  return parsed;
}

/** Lê ?page=&limit= da query string. */
export function parsePageRequest(query: Record<string, unknown>): PageRequest {
  const page = readPositiveInt(query.page, 'page', 1);
  const limit = Math.min(readPositiveInt(query.limit, 'limit', DEFAULT_LIMIT), MAX_LIMIT);
  return { page, limit };
}

export function buildPage<T>(result: PagedResult<T>, request: PageRequest): Page<T> {
  return {
    data: result.items,
    page: request.page,
    limit: request.limit,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / request.limit)),
  };
}

/** Lê um id de rota (/:id). */
export function parseId(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError('Identificador inválido', { id: 'Deve ser um inteiro positivo' });
  }
  return parsed;
}
