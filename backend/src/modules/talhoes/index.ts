import { Router, type RequestHandler } from 'express';
import { CrudController } from '../../shared/crud/CrudController';
import { createCrudRouter } from '../../shared/crud/createCrudRouter';
import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import type { AreaPorPropriedade, Propriedade } from '../propriedades';
import type { Talhao } from './Talhao';
import { TalhaoService } from './TalhaoService';

export { Talhao, type TalhaoProps } from './Talhao';
export { TalhaoRepository } from './TalhaoRepository';

export interface TalhoesDeps {
  /** O repositório de talhões também implementa a consulta de área usada por propriedades. */
  repository: ScopedRepository<Talhao> & AreaPorPropriedade;
  propriedades: ScopedRepository<Propriedade>;
  authenticate: RequestHandler;
}

export function createTalhoesModule({ repository, propriedades, authenticate }: TalhoesDeps): Router {
  const router = Router();
  router.use('/api/talhoes', createCrudRouter(new CrudController(new TalhaoService(repository, propriedades)), authenticate));
  return router;
}
