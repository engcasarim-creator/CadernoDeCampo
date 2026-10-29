import type { RequestHandler } from 'express';
import type { ComparativoService } from '../services/ComparativoService';
import { asyncHandler, requireAuth } from '../utils/asyncHandler';
import { parseId } from '../utils/pagination';

export class ComparativoController {
  constructor(private readonly service: ComparativoService) {}

  porSafra: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.porSafra(requireAuth(req).sub, parseId(req.params.id)));
  });
}
