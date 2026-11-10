import { Router, type RequestHandler } from 'express';
import type { PasswordHasher } from '../../shared/security/PasswordHasher';
import { AdminUsuarioController } from './AdminUsuarioController';
import { AdminUsuarioService } from './AdminUsuarioService';
import { UserController } from './UserController';
import { UserService } from './UserService';
import type { UsuarioRepository } from './UsuarioRepository';

export { Usuario } from './Usuario';
export { MySqlUsuarioRepository } from './MySqlUsuarioRepository';
export { garantirAdministrador } from './AdminBootstrap';
export { createRequireAdmin } from './requireAdmin';
export type { UsuarioRepository } from './UsuarioRepository';

export interface UsuariosDeps {
  repository: UsuarioRepository;
  hasher: PasswordHasher;
  authenticate: RequestHandler;
  /** Guardas da área de administração (login + papel ADMIN). */
  adminOnly: RequestHandler[];
}

export function createUsuariosModule({ repository, hasher, authenticate, adminOnly }: UsuariosDeps): Router {
  const perfil = new UserController(new UserService(repository, hasher));
  const admin = new AdminUsuarioController(new AdminUsuarioService(repository, hasher));
  const router = Router();
  // "/me" precisa vir antes de "/:id".
  router.get('/api/usuarios/me', authenticate, perfil.me);
  router.put('/api/usuarios/:id', authenticate, perfil.update);
  router.get('/api/admin/usuarios', ...adminOnly, admin.listar);
  router.get('/api/admin/usuarios/:id', ...adminOnly, admin.obter);
  router.put('/api/admin/usuarios/:id', ...adminOnly, admin.atualizar);
  return router;
}
