import { Router, type RequestHandler } from 'express';
import { CrudController } from '../../shared/crud/CrudController';
import { createCrudRouter } from '../../shared/crud/createCrudRouter';
import type { TipoPersonalizadoRepository, UsoDeTipo } from './TipoPersonalizadoRepository';
import { TipoPersonalizadoService } from './TipoPersonalizadoService';
import { TiposDisponiveisController } from './TiposDisponiveisController';

export {
  gerarChave,
  TipoPersonalizado,
  type CampoTipo,
  type TipoPersonalizadoProps,
  type ValoresAtividade,
} from './TipoPersonalizado';
export { MySqlTipoPersonalizadoRepository } from './MySqlTipoPersonalizadoRepository';
export type { TipoPersonalizadoRepository, UsoDeTipo } from './TipoPersonalizadoRepository';

export interface TiposAtividadeDeps {
  repository: TipoPersonalizadoRepository;
  /** Porta implementada pelo módulo de atividades. */
  uso: UsoDeTipo;
  authenticate: RequestHandler;
  /** Guardas da área de administração (login + papel ADMIN). */
  adminOnly: RequestHandler[];
}

export function createTiposAtividadeModule({ repository, uso, authenticate, adminOnly }: TiposAtividadeDeps): Router {
  const service = new TipoPersonalizadoService(repository, uso);
  const router = Router();
  // Qualquer usuário logado escolhe entre os tipos; só o administrador os gerencia.
  router.get('/api/tipos-atividade', authenticate, new TiposDisponiveisController(service).listar);
  router.use('/api/admin/tipos-atividade', createCrudRouter(new CrudController(service), adminOnly));
  return router;
}
