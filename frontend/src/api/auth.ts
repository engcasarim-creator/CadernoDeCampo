import type { Usuario } from '../types';
import { request } from './client';

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
}

export interface UpdateUserPayload {
  nome: string;
  cpf: string;
  senha: string;
}

export const authApi = {
  login: (email: string, senha: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: { email, senha } }),
  register: (payload: RegisterPayload) => request<Usuario>('/auth/register', { method: 'POST', body: payload }),
  me: () => request<Usuario>('/usuarios/me'),
  update: (id: number, payload: UpdateUserPayload) =>
    request<Usuario>(`/usuarios/${id}`, { method: 'PUT', body: payload }),
};
