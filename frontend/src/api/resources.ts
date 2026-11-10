import type {
  Atividade,
  Contestacao,
  ContestacaoAdminDetalhe,
  ContestacaoResumoAdmin,
  ListaDeNotificacoes,
  StatusContestacao,
  ComparativoSafra,
  Page,
  Propriedade,
  ResourceRecord,
  Safra,
  Talhao,
  PropriedadeAdmin,
  PropriedadeAdminDetalhe,
  TipoPersonalizado,
  Usuario,
} from '../types';
import { request, requestBlob } from './client';

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

/** Área de administração (só ADMIN): o mesmo cliente genérico, apontando para /admin. */
export const usuariosAdminApi = createResourceApi<Usuario>('/admin/usuarios');
export const tiposAdminApi = createResourceApi<TipoPersonalizado>('/admin/tipos-atividade');

/** Administração de propriedades: todas as propriedades (de todos os usuários) e troca de responsável. */
export const propriedadesAdminApi = {
  listar: ({ page, limit, busca }: { page: number; limit: number; busca: string }) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (busca.trim() !== '') query.set('busca', busca.trim());
    return request<Page<PropriedadeAdmin>>(`/admin/propriedades?${query.toString()}`);
  },
  obter: (id: number) => request<PropriedadeAdminDetalhe>(`/admin/propriedades/${id}`),
  transferir: (id: number, corpo: { novoUsuarioId: number; motivo: string }) =>
    request<PropriedadeAdminDetalhe>(`/admin/propriedades/${id}/transferencia`, { method: 'POST', body: corpo }),
};

/** Tipos criados pelo administrador, para qualquer usuário logado escolher ao registrar uma atividade. */
export const tiposDisponiveisApi = {
  listar: () => request<{ data: TipoPersonalizado[] }>('/tipos-atividade').then((resposta) => resposta.data),
};

export const comparativoApi = {
  porSafra: (safraId: number) => request<ComparativoSafra>(`/safras/${safraId}/comparativo`),
};

/** Contestação: o dono real abre um pedido com PDFs de prova e acompanha a decisão. */
export const contestacoesApi = {
  abrir: (form: FormData) => request<Contestacao>('/contestacoes', { method: 'POST', body: form }),
  listar: (page: number, limit: number) => request<Page<Contestacao>>(`/contestacoes?page=${page}&limit=${limit}`),
  baixarArquivo: (id: number, arquivoId: number) => requestBlob(`/contestacoes/${id}/arquivos/${arquivoId}`),
};

/** Administração das contestações: ler os PDFs, decidir e avisar o solicitante. */
export const contestacoesAdminApi = {
  listar: ({ page, limit, status }: { page: number; limit: number; status: StatusContestacao | '' }) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status !== '') query.set('status', status);
    return request<Page<ContestacaoResumoAdmin>>(`/admin/contestacoes?${query.toString()}`);
  },
  obter: (id: number) => request<ContestacaoAdminDetalhe>(`/admin/contestacoes/${id}`),
  baixarArquivo: (id: number, arquivoId: number) => requestBlob(`/admin/contestacoes/${id}/arquivos/${arquivoId}`),
  decidir: (id: number, corpo: { decisao: 'DEFERIDA' | 'INDEFERIDA'; motivo: string }) =>
    request<ContestacaoAdminDetalhe>(`/admin/contestacoes/${id}/decisao`, { method: 'PUT', body: corpo }),
};

export const notificacoesApi = {
  listar: (page: number, limit: number) => request<ListaDeNotificacoes>(`/notificacoes?page=${page}&limit=${limit}`),
  marcarLida: (id: number) => request<void>(`/notificacoes/${id}/lida`, { method: 'PUT' }),
  marcarTodasLidas: () => request<void>('/notificacoes/lidas', { method: 'PUT' }),
};
