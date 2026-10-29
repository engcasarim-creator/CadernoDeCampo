import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from '../errors';
import type { AuthPayload } from '../types';

/** Express 4 não captura rejeições de handlers async; este wrapper repassa o erro ao errorHandler. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** Devolve o usuário autenticado (preenchido pelo middleware `authenticate`). */
export function requireAuth(req: Request): AuthPayload {
  if (!req.auth) throw new UnauthorizedError('Autenticação necessária');
  return req.auth;
}
