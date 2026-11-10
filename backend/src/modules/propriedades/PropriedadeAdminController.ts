import type { RequestHandler } from 'express';
import { asyncHandler, requireAuth } from '../../shared/utils/asyncHandler';
import { parseId } from '../../shared/utils/pagination';
import type { PropriedadeAdminService } from './PropriedadeAdminService';

export class PropriedadeAdminController {
  constructor(private readonly service: PropriedadeAdminService) {}

  listar: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.listar(req.query));
  });

  obter: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.obter(parseId(req.params.id)));
  });

  transferir: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.transferir(requireAuth(req).sub, parseId(req.params.id), req.body));
  });
}
