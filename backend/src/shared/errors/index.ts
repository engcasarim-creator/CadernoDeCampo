/** Erros customizados da aplicação. O errorHandler converte cada um em resposta HTTP. */

export type ErrorDetails = Record<string, string>;

export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
}
