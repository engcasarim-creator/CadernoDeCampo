import type { PasswordHasher } from '../contracts/PasswordHasher';
import { ValidationError } from '../errors';
import { isValidCpf, isValidEmail } from '../utils/validators';
import { Entity } from './Entity';

export interface UsuarioProps {
  nome: string;
  email: string;
  senhaHash: string;
  cpf: string;
}

export interface PerfilAtualizado {
  nome: string;
  cpf: string;
  senhaHash: string;
}

export class Usuario extends Entity<UsuarioProps> {
  readonly #nome: string;
  readonly #email: string;
  readonly #senhaHash: string;
  readonly #cpf: string;

  constructor(props: UsuarioProps, id: number | null = null) {
    super(id);
    if (props.nome.trim() === '') throw new ValidationError('Nome é obrigatório', { nome: 'Campo obrigatório' });
    if (!isValidEmail(props.email)) throw new ValidationError('E-mail inválido', { email: 'E-mail inválido' });
    if (!isValidCpf(props.cpf)) throw new ValidationError('CPF inválido', { cpf: 'CPF inválido' });
    if (props.senhaHash === '') throw new ValidationError('Senha é obrigatória', { senha: 'Campo obrigatório' });
    this.#nome = props.nome;
    this.#email = props.email;
    this.#senhaHash = props.senhaHash;
    this.#cpf = props.cpf;
  }

  get nome(): string {
    return this.#nome;
  }

  get email(): string {
    return this.#email;
  }

  get cpf(): string {
    return this.#cpf;
  }

  /** O hash nunca sai da entidade: a conferência acontece aqui dentro. */
  autenticar(senha: string, hasher: PasswordHasher): Promise<boolean> {
    return hasher.compare(senha, this.#senhaHash);
  }

  /**
   * Regra de negócio: o e-mail é a identidade do usuário e NÃO pode ser alterado.
   * Por isso não existe nenhum método que receba um novo e-mail.
   */
  comPerfilAtualizado(perfil: PerfilAtualizado): Usuario {
    return new Usuario({ ...perfil, email: this.#email }, this.id);
  }

  toProps(): UsuarioProps {
    return { nome: this.#nome, email: this.#email, senhaHash: this.#senhaHash, cpf: this.#cpf };
  }

  toJSON(): Record<string, unknown> {
    return { id: this.id, nome: this.#nome, email: this.#email, cpf: this.#cpf };
  }
}
