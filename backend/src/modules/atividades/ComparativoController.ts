import type { RequestHandler } from 'express';
import type { ComparativoService } from './ComparativoService';
import { asyncHandler, requireAuth } from '../../shared/utils/asyncHandler';
import { parseId } from '../../shared/utils/pagination';

export class ComparativoController {
  constructor(private readonly service: ComparativoService) {}

  porSafra: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.porSafra(requireAuth(req).sub, parseId(req.params.id)));
  });
}
