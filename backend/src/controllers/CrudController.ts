import type { RequestHandler } from 'express';
import type { Entity } from '../entities/Entity';
import type { CrudOperations } from '../services/CrudService';
import { asyncHandler, requireAuth } from '../utils/asyncHandler';
import { parseId } from '../utils/pagination';

/** Controller genérico: o mesmo código HTTP serve para os 4 CRUDs. */
export class CrudController<T extends Entity<object>> {
  constructor(private readonly service: CrudOperations<T>) {}

  list: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.list(requireAuth(req).sub, req.query));
  });

  get: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.get(requireAuth(req).sub, parseId(req.params.id)));
  });

  create: RequestHandler = asyncHandler(async (req, res) => {
    res.status(201).json(await this.service.create(requireAuth(req).sub, req.body));
  });

  update: RequestHandler = asyncHandler(async (req, res) => {
    res.json(await this.service.update(requireAuth(req).sub, parseId(req.params.id), req.body));
  });

  remove: RequestHandler = asyncHandler(async (req, res) => {
    await this.service.remove(requireAuth(req).sub, parseId(req.params.id));
    res.status(204).send();
  });
}
