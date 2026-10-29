import type { Pool } from 'mysql2/promise';
import type { Env } from './config/env';
import { AuthController } from './controllers/AuthController';
import { ComparativoController } from './controllers/ComparativoController';
import { CrudController } from './controllers/CrudController';
import { UserController } from './controllers/UserController';
import { AtividadeRepository } from './repositories/AtividadeRepository';
import { MySqlUsuarioRepository } from './repositories/MySqlUsuarioRepository';
import { PropriedadeRepository } from './repositories/PropriedadeRepository';
import { SafraRepository } from './repositories/SafraRepository';
import { TalhaoRepository } from './repositories/TalhaoRepository';
import { BcryptPasswordHasher } from './security/BcryptPasswordHasher';
import { JwtTokenService } from './security/JwtTokenService';
import { AtividadeService } from './services/AtividadeService';
import { AuthService } from './services/AuthService';
import { ComparativoService } from './services/ComparativoService';
import { PropriedadeService } from './services/PropriedadeService';
import { SafraService } from './services/SafraService';
import { TalhaoService } from './services/TalhaoService';
import { UserService } from './services/UserService';

/** Composition root: único lugar que conhece as classes concretas e liga tudo (injeção de dependência manual). */
export function createContainer(env: Env, pool: Pool) {
  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService(env.jwt.secret, env.jwt.expiresIn);

  const usuarios = new MySqlUsuarioRepository(pool);
  const propriedades = new PropriedadeRepository(pool);
  const talhoes = new TalhaoRepository(pool);
  const safras = new SafraRepository(pool);
  const atividades = new AtividadeRepository(pool);

  return {
    pool,
    tokens,
    authController: new AuthController(new AuthService(usuarios, hasher, tokens)),
    userController: new UserController(new UserService(usuarios, hasher)),
    propriedadeController: new CrudController(new PropriedadeService(propriedades, talhoes)),
    talhaoController: new CrudController(new TalhaoService(talhoes, propriedades)),
    safraController: new CrudController(new SafraService(safras, talhoes)),
    atividadeController: new CrudController(new AtividadeService(atividades, safras)),
    comparativoController: new ComparativoController(new ComparativoService(atividades, safras)),
  };
}

export type Container = ReturnType<typeof createContainer>;
