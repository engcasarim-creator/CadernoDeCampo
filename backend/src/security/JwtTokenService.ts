import jwt, { type SignOptions } from 'jsonwebtoken';
import type { TokenService } from '../contracts/TokenService';
import { UnauthorizedError } from '../errors';
import type { AuthPayload } from '../types';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: AuthPayload): string {
    const options: SignOptions = {
      subject: String(payload.sub),
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
    };
    return jwt.sign({ email: payload.email }, this.secret, options);
  }

  verify(token: string): AuthPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === 'string') throw new Error('payload inesperado');
      const sub = Number(decoded.sub);
      const email = decoded.email;
      if (!Number.isInteger(sub) || typeof email !== 'string') throw new Error('payload incompleto');
      return { sub, email };
    } catch {
      throw new UnauthorizedError('Sessão inválida ou expirada. Faça login novamente.');
    }
  }
}
