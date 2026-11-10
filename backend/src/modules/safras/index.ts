import { Router, type RequestHandler } from 'express';
import { CrudController } from '../../shared/crud/CrudController';
import { createCrudRouter } from '../../shared/crud/createCrudRouter';
import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import type { Talhao } from '../talhoes';
import type { Safra } from './Safra';
import { SafraService } from './SafraService';

export { Safra, type SafraProps } from './Safra';
export { SafraRepository } from './SafraRepository';

export interface SafrasDeps {
  repository: ScopedRepository<Safra>;
  talhoes: ScopedRepository<Talhao>;
  authenticate: RequestHandler;
}

export function createSafrasModule({ repository, talhoes, authenticate }: SafrasDeps): Router {
  const router = Router();
  router.use('/api/safras', createCrudRouter(new CrudController(new SafraService(repository, talhoes)), authenticate));
  return router;
}
