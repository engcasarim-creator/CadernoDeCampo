import { Router } from 'express';
import type { PasswordHasher } from '../../shared/security/PasswordHasher';
import type { TokenService } from '../../shared/security/TokenService';
import type { UsuarioRepository } from '../usuarios';
import { AuthController } from './AuthController';
import { AuthService } from './AuthService';

export interface AutenticacaoDeps {
  usuarios: UsuarioRepository;
  hasher: PasswordHasher;
  tokens: TokenService;
}

/** Rotas públicas de cadastro e login. */
export function createAutenticacaoModule({ usuarios, hasher, tokens }: AutenticacaoDeps): Router {
  const controller = new AuthController(new AuthService(usuarios, hasher, tokens));
  const router = Router();
  router.post('/api/auth/register', controller.register);
  router.post('/api/auth/login', controller.login);
  return router;
}
