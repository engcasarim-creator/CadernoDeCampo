import type { AuthPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware de autenticação. */
      auth?: AuthPayload;
    }
  }
}

export {};
