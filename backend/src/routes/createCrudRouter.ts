import { Router, type RequestHandler } from 'express';
import type { CrudController } from '../controllers/CrudController';
import type { Entity } from '../entities/Entity';

/** Monta as 5 rotas REST de um recurso. O `authenticate` protege TODAS elas. */
export function createCrudRouter<T extends Entity<object>>(
  controller: CrudController<T>,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
