import type { AuthPayload } from '../types';

export interface TokenService {
  sign(payload: AuthPayload): string;
  /** Lança UnauthorizedError se o token for inválido ou estiver expirado. */
  verify(token: string): AuthPayload;
}
