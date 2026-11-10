import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './shared/http/errorHandler';

export function createApp(container: Container): Express {
  const app = express();

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

  // Cada módulo traz as suas rotas (autenticação, usuários, tipos de atividade, propriedades, ...).
  container.routers.forEach((router) => app.use(router));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
