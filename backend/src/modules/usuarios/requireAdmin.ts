import type { RequestHandler } from 'express';
import type { UsuarioRepository } from './UsuarioRepository';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors';

/**
 * Exige que o usuário autenticado seja ADMIN (usar depois do `authenticate`).
 * O papel é conferido no banco a cada requisição, e não no token: se um administrador
 * perder o acesso, ele cai na hora, sem esperar o JWT expirar.
 */
export function createRequireAdmin(usuarios: Pick<UsuarioRepository, 'findById'>): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthorizedError('Autenticação necessária'));
      return;
    }
    usuarios
      .findById(req.auth.sub)
      .then((usuario) => next(usuario?.ehAdministrador ? undefined : new ForbiddenError('Acesso restrito a administradores')))
      .catch(next);
  };
}
