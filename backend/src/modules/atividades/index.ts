import { Router, type RequestHandler } from 'express';
import { CrudController } from '../../shared/crud/CrudController';
import { createCrudRouter } from '../../shared/crud/createCrudRouter';
import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import type { Safra } from '../safras';
import type { TipoPersonalizadoRepository } from '../tipos-atividade';
import type { Atividade } from './Atividade';
import { AtividadeService } from './AtividadeService';
import { ComparativoController } from './ComparativoController';
import { ComparativoService } from './ComparativoService';

export { Atividade, type AtividadeProps } from './Atividade';
export { AtividadeFactory } from './AtividadeFactory';
export { AtividadeRepository } from './AtividadeRepository';

export interface AtividadesDeps {
  repository: ScopedRepository<Atividade>;
  safras: ScopedRepository<Safra>;
  tipos: Pick<TipoPersonalizadoRepository, 'findById'>;
  authenticate: RequestHandler;
}

export function createAtividadesModule({ repository, safras, tipos, authenticate }: AtividadesDeps): Router {
  const router = Router();
  const comparativo = new ComparativoController(new ComparativoService(repository, safras));
  // Rota específica antes do CRUD (o CRUD captura "/api/atividades/:id", mas o comparativo é de safras).
  router.get('/api/safras/:id/comparativo', authenticate, comparativo.porSafra);
  router.use('/api/atividades', createCrudRouter(new CrudController(new AtividadeService(repository, safras, tipos)), authenticate));
  return router;
}
