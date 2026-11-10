import type { RequestHandler } from 'express';
import type { AdminUsuarioService } from './AdminUsuarioService';
import { asyncHandler, requireAuth } from '../../shared/utils/asyncHandler';
import { parseId } from '../../shared/utils/pagination';

export class AdminUsuarioController {
  constructor(private readonly service: AdminUsuarioService) {}

  listar: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.listar(req.query));
  });

  obter: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.obter(parseId(req.params.id)));
  });

  atualizar: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.atualizar(requireAuth(req).sub, parseId(req.params.id), req.body));
  });
}
