import type { FieldErrors } from '../types';

const TOKEN_KEY = 'cdc_token';

/** Token no localStorage (com try/catch: o acesso pode falhar em modo privado). */
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* sem armazenamento disponível: a sessão vale só até recarregar */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nada a fazer */
    }
  },
};

/** Erro de API já com mensagem amigável e erros por campo. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;

/** Chamado quando a API responde 401 numa rota protegida (token expirado, por exemplo). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Objeto (vai como JSON) ou FormData (vai como multipart, ex.: envio de PDFs). */
  body?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseErrorBody(body: unknown): { message?: string; details: FieldErrors } {
  if (!isRecord(body)) return { details: {} };
  const details: FieldErrors = {};
  if (isRecord(body.details)) {
    for (const [field, message] of Object.entries(body.details)) {
      if (typeof message === 'string') details[field] = message;
    }
  }
  return { message: typeof body.message === 'string' ? body.message : undefined, details };
}

const FRIENDLY_BY_STATUS: Record<number, string> = {
  401: 'Sua sessão expirou. Faça login novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Registro não encontrado.',
  409: 'Já existe um registro com esses dados.',
};

/** Faz a chamada autenticada e converte qualquer resposta de erro em ApiError. */
async function send(path: string, { method = 'GET', body }: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const multipart = body instanceof FormData;
  // Em multipart o navegador define o Content-Type (com o "boundary"): não pode ser fixado aqui.
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', 0);
  }
  if (response.ok) return response;

  const parsed = parseErrorBody(await response.json().catch(() => null));
  const isAuthRoute = path.startsWith('/auth/');
  if (response.status === 401 && !isAuthRoute) {
    tokenStorage.clear();
    onUnauthorized?.();
  }
  const fallback =
    response.status >= 500
      ? 'O servidor encontrou um problema. Tente novamente em instantes.'
      : (FRIENDLY_BY_STATUS[response.status] ?? 'Não foi possível concluir a operação.');
  throw new ApiError(parsed.message ?? fallback, response.status, parsed.details);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Baixa um arquivo protegido (precisa do token, então não dá para usar um link comum). */
export async function requestBlob(path: string): Promise<Blob> {
  return (await send(path, {})).blob();
}
