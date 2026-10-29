import { ValidationError } from '../errors';
import { isValidCpf, isValidEmail, isValidIsoDate, normalizeCpf, passwordIssues } from './validators';

interface NumberOptions {
  min?: number;
  /** Quando verdadeiro, o valor precisa ser estritamente maior que `min`. */
  exclusive?: boolean;
}

/**
 * Lê e valida campos de um corpo de requisição desconhecido (`unknown`) sem usar `any`.
 * Os erros são acumulados por campo; `finish()` lança um único ValidationError.
 */
export class BodyReader {
  readonly #body: Record<string, unknown>;
  readonly #errors: Record<string, string> = {};
  readonly #prefix: string;

  constructor(raw: unknown, prefix = '') {
    this.#body =
      typeof raw === 'object' && raw !== null && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    this.#prefix = prefix;
  }

  #fail(field: string, message: string): void {
    this.#errors[`${this.#prefix}${field}`] = message;
  }

  #isMissing(value: unknown): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }

  raw(field: string): unknown {
    return this.#body[field];
  }

  string(field: string, max = 255): string {
    const value = this.#body[field];
    if (this.#isMissing(value)) {
      this.#fail(field, 'Campo obrigatório');
      return '';
    }
    if (typeof value !== 'string') {
      this.#fail(field, 'Deve ser um texto');
      return '';
    }
    const text = value.trim();
    if (text.length > max) this.#fail(field, `Deve ter no máximo ${max} caracteres`);
    return text;
  }

  optionalString(field: string, max = 255): string | null {
    return this.#isMissing(this.#body[field]) ? null : this.string(field, max);
  }

  number(field: string, options: NumberOptions = {}): number {
    const value = this.#body[field];
    if (this.#isMissing(value)) {
      this.#fail(field, 'Campo obrigatório');
      return 0;
    }
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(parsed)) {
      this.#fail(field, 'Deve ser um número');
      return 0;
    }
    if (options.min !== undefined) {
      const invalid = options.exclusive ? parsed <= options.min : parsed < options.min;
      if (invalid) {
        this.#fail(
          field,
          options.exclusive ? `Deve ser maior que ${options.min}` : `Deve ser no mínimo ${options.min}`,
        );
      }
    }
    return parsed;
  }

  integer(field: string, min = 1): number {
    const value = this.number(field, { min });
    if (!Number.isInteger(value)) this.#fail(field, 'Deve ser um número inteiro');
    return value;
  }

  date(field: string): string {
    const text = this.string(field, 10);
    if (text !== '' && !isValidIsoDate(text)) this.#fail(field, 'Data inválida (use AAAA-MM-DD)');
    return text;
  }

  optionalDate(field: string): string | null {
    return this.#isMissing(this.#body[field]) ? null : this.date(field);
  }

  oneOf<T extends string>(field: string, allowed: readonly T[]): T {
    const value = this.string(field, 40);
    const found = allowed.find((option) => option === value);
    if (found === undefined) {
      if (value !== '') this.#fail(field, `Valor inválido. Use: ${allowed.join(', ')}`);
      return allowed[0] as T;
    }
    return found;
  }

  email(field: string): string {
    const value = this.string(field, 254).toLowerCase();
    if (value !== '' && !isValidEmail(value)) this.#fail(field, 'E-mail inválido');
    return value;
  }

  cpf(field: string): string {
    const value = this.string(field, 14);
    if (value === '') return '';
    if (!isValidCpf(value)) {
      this.#fail(field, 'CPF inválido');
      return '';
    }
    return normalizeCpf(value);
  }

  /** Senha com regras de força. Use `passwordAny` no login (não revela as regras). */
  password(field: string): string {
    const value = this.#body[field];
    if (typeof value !== 'string' || value === '') {
      this.#fail(field, 'Campo obrigatório');
      return '';
    }
    if (value.length > 72) {
      this.#fail(field, 'Deve ter no máximo 72 caracteres');
      return '';
    }
    const issues = passwordIssues(value);
    if (issues.length > 0) this.#fail(field, `A senha deve ${issues.join(', ')}`);
    return value;
  }

  passwordAny(field: string): string {
    const value = this.#body[field];
    if (typeof value !== 'string' || value === '') {
      this.#fail(field, 'Campo obrigatório');
      return '';
    }
    return value;
  }

  finish(): void {
    if (Object.keys(this.#errors).length > 0) {
      throw new ValidationError('Dados inválidos. Verifique os campos informados.', this.#errors);
    }
  }
}
