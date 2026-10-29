import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Container } from './container';
import { createAuthenticate } from './middlewares/authenticate';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { createCrudRouter } from './routes/createCrudRouter';

export function createApp(container: Container): Express {
  const app = express();
  const authenticate = createAuthenticate(container.tokens);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  // Usado pelo healthcheck do Docker (não exige login).
  app.get('/api/health', (_req, res) => {
    container.pool
      .query('SELECT 1')
      .then(() => res.json({ status: 'ok' }))
      .catch(() => res.status(503).json({ status: 'database unavailable' }));
  });

  // Rotas públicas
  app.post('/api/auth/register', container.authController.register);
  app.post('/api/auth/login', container.authController.login);

  // Usuário (autenticado). "/me" precisa vir antes de "/:id".
  app.get('/api/usuarios/me', authenticate, container.userController.me);
  app.put('/api/usuarios/:id', authenticate, container.userController.update);

  // Comparativo plantio × colheita de uma safra (autenticado)
  app.get('/api/safras/:id/comparativo', authenticate, container.comparativoController.porSafra);

  // 4 CRUDs, todos autenticados e paginados
  app.use('/api/propriedades', createCrudRouter(container.propriedadeController, authenticate));
  app.use('/api/talhoes', createCrudRouter(container.talhaoController, authenticate));
  app.use('/api/safras', createCrudRouter(container.safraController, authenticate));
  app.use('/api/atividades', createCrudRouter(container.atividadeController, authenticate));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
