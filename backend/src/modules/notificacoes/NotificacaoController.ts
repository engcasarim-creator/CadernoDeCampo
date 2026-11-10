import type { RequestHandler } from 'express';
import { asyncHandler, requireAuth } from '../../shared/utils/asyncHandler';
import { parseId } from '../../shared/utils/pagination';
import type { NotificacaoService } from './NotificacaoService';

export class NotificacaoController {
  constructor(private readonly service: NotificacaoService) {}

  listar: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.listar(requireAuth(req).sub, req.query));
  });

  marcarLida: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.marcarLida(requireAuth(req).sub, parseId(req.params.id));
    res.status(204).end();
  });

  marcarTodasLidas: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.marcarTodasLidas(requireAuth(req).sub);
    res.status(204).end();
  });
}
