import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../errors';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError('Rota não encontrada'));
};

function isBodyParserError(error: unknown): error is { type: string } {
  return typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string';
}

/** Converte qualquer erro em JSON { message, details? } com o status HTTP correto. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, details: error.details });
    return;
  }
  if (isBodyParserError(error) && error.type.startsWith('entity.')) {
    res.status(400).json({ message: 'Corpo da requisição inválido (JSON malformado ou grande demais)' });
    return;
  }
  console.error('Erro inesperado:', error);
  res.status(500).json({ message: 'Erro interno do servidor' });
};
