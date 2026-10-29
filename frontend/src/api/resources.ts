import type { Atividade, ComparativoSafra, Page, Propriedade, ResourceRecord, Safra, Talhao } from '../types';
import { request } from './client';

export interface ListParams {
  page: number;
  limit: number;
  filter?: { param: string; value: string };
}

export type Payload = Record<string, unknown>;

export interface ResourceApi<T extends ResourceRecord> {
  list(params: ListParams): Promise<Page<T>>;
  get(id: number): Promise<T>;
  create(payload: Payload): Promise<T>;
  update(id: number, payload: Payload): Promise<T>;
  remove(id: number): Promise<void>;
}

/** Cliente genérico (Generics): o mesmo código atende os 4 recursos, cada um tipado com o seu T. */
export function createResourceApi<T extends ResourceRecord>(path: string): ResourceApi<T> {
  return {
    list({ page, limit, filter }) {
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter && filter.value !== '') query.set(filter.param, filter.value);
      return request<Page<T>>(`${path}?${query.toString()}`);
    },
    get: (id) => request<T>(`${path}/${id}`),
    create: (payload) => request<T>(path, { method: 'POST', body: payload }),
    update: (id, payload) => request<T>(`${path}/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request<void>(`${path}/${id}`, { method: 'DELETE' }),
  };
}

export const propriedadesApi = createResourceApi<Propriedade>('/propriedades');
export const talhoesApi = createResourceApi<Talhao>('/talhoes');
export const safrasApi = createResourceApi<Safra>('/safras');
export const atividadesApi = createResourceApi<Atividade>('/atividades');

export const comparativoApi = {
  porSafra: (safraId: number) => request<ComparativoSafra>(`/safras/${safraId}/comparativo`),
};
