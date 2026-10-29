import type { RequestHandler } from 'express';
import type { UserService } from '../services/UserService';
import { asyncHandler, requireAuth } from '../utils/asyncHandler';
import { parseId } from '../utils/pagination';

export class UserController {
  constructor(private readonly service: UserService) {}

  me: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.obter(requireAuth(req).sub));
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    const auth = requireAuth(req);
    const usuario = await this.service.atualizar(auth.sub, parseId(req.params.id), req.body);
    res.json(usuario);
  });
}
