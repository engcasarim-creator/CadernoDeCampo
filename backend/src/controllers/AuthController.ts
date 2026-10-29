import type { RequestHandler } from 'express';
import type { AuthService } from '../services/AuthService';
import { asyncHandler } from '../utils/asyncHandler';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register: RequestHandler = asyncHandler(async (req, res) => {
    const usuario = await this.service.register(req.body);
    res.status(201).json(usuario);
  });

  login: RequestHandler = asyncHandler(async (req, res) => {
    const { token, usuario } = await this.service.login(req.body);
    res.json({ token, usuario });
  });
}
