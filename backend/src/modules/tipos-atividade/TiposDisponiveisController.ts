import type { RequestHandler } from 'express';
import type { TipoPersonalizadoService } from './TipoPersonalizadoService';
import { asyncHandler } from '../../shared/utils/asyncHandler';

/** Tipos personalizados que qualquer usuário logado pode escolher ao registrar uma atividade. */
export class TiposDisponiveisController {
  constructor(private readonly service: TipoPersonalizadoService) {}

  listar: RequestHandler = asyncHandler(async (_req, res) => {
    res.json({ data: await this.service.listarTodos() });
  });
}
