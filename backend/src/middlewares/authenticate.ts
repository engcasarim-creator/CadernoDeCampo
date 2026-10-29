import type { RequestHandler } from 'express';
import type { TokenService } from '../contracts/TokenService';
import { UnauthorizedError } from '../errors';

/** Exige "Authorization: Bearer <jwt>" válido. Sem isso, a rota responde 401. */
export function createAuthenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      next(new UnauthorizedError('Autenticação necessária'));
      return;
    }
    try {
      req.auth = tokens.verify(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
