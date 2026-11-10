import type { Router } from 'express';
import type { Pool } from 'mysql2/promise';
import type { Env } from './config/env';
import { runMigrations } from './database/migrations';
import { createModulos } from './modules';
import { AtividadeRepository } from './modules/atividades';
import { MySqlContestacaoRepository } from './modules/contestacoes';
import { MySqlNotificacaoRepository } from './modules/notificacoes';
import { MySqlAdministracaoDePropriedades, PropriedadeRepository } from './modules/propriedades';
import { SafraRepository } from './modules/safras';
import { TalhaoRepository } from './modules/talhoes';
import { MySqlTipoPersonalizadoRepository } from './modules/tipos-atividade';
import { garantirAdministrador, MySqlUsuarioRepository } from './modules/usuarios';
import { criarEmailSender } from './shared/email';
import { ArmazenamentoLocal } from './shared/storage';
import { BcryptPasswordHasher } from './shared/security/BcryptPasswordHasher';
import { JwtTokenService } from './shared/security/JwtTokenService';

/** Contrato que o `app.ts` usa: tem o necessário para subir a API, sem conhecer nenhum módulo de domínio. */
export interface Container {
  pool: Pick<Pool, 'query'>;
  /** Routers dos módulos (cada um com as suas URLs). */
  routers: Router[];
  /** Prepara o banco ao iniciar: migrações pendentes e administrador inicial (ADMIN_*). */
  iniciar(): Promise<void>;
}

/** Composition root: único lugar que conhece as classes concretas (MySQL, bcrypt, JWT) e liga tudo. */
export function createContainer(env: Env, pool: Pool): Container {
  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService(env.jwt.secret, env.jwt.expiresIn);
  const usuarios = new MySqlUsuarioRepository(pool);

  return {
    pool,
    routers: createModulos({
      hasher,
      tokens,
      usuarios,
      propriedades: new PropriedadeRepository(pool),
      propriedadesAdmin: new MySqlAdministracaoDePropriedades(pool),
      talhoes: new TalhaoRepository(pool),
      safras: new SafraRepository(pool),
      atividades: new AtividadeRepository(pool),
      tipos: new MySqlTipoPersonalizadoRepository(pool),
      contestacoes: new MySqlContestacaoRepository(pool),
      notificacoes: new MySqlNotificacaoRepository(pool),
      email: criarEmailSender(env.smtp),
      arquivos: new ArmazenamentoLocal(env.uploadsDir),
    }),
    iniciar: async () => {
      await runMigrations(pool);
      if (env.admin) await garantirAdministrador(usuarios, hasher, env.admin);
    },
  };
}
