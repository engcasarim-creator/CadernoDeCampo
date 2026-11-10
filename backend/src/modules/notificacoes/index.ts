import { Router, type RequestHandler } from 'express';
import { NotificacaoController } from './NotificacaoController';
import { NotificacaoService } from './NotificacaoService';

export type { Notificacao, NovaNotificacao } from './Notificacao';
export type { NotificacaoRepository } from './NotificacaoRepository';
export { MySqlNotificacaoRepository } from './MySqlNotificacaoRepository';
/** Serviço usado por outros módulos para avisar um usuário (`notificar`). */
export { NotificacaoService } from './NotificacaoService';

export interface NotificacoesDeps {
  /** Mesmo serviço entregue aos módulos que enviam avisos (um só ponto de gravação). */
  service: NotificacaoService;
  authenticate: RequestHandler;
}

export function createNotificacoesModule({ service, authenticate }: NotificacoesDeps): Router {
  const controller = new NotificacaoController(service);
  const router = Router();
  router.get('/api/notificacoes', authenticate, controller.listar);
  // "/lidas" antes de "/:id/lida".
  router.put('/api/notificacoes/lidas', authenticate, controller.marcarTodasLidas);
  router.put('/api/notificacoes/:id/lida', authenticate, controller.marcarLida);
  return router;
}
