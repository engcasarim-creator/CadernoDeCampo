import { Router, type RequestHandler } from 'express';
import type { CrudController } from './CrudController';
import type { Entity } from './Entity';

/** Monta as 5 rotas REST de um recurso. Os guardas (ex.: autenticação, administrador) protegem TODAS elas. */
export function createCrudRouter<T extends Entity<object>>(
  controller: CrudController<T>,
  guards: RequestHandler | RequestHandler[],
): Router {
  const router = Router();
  router.use(...(Array.isArray(guards) ? guards : [guards]));
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
