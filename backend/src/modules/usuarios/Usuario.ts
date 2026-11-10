import type { PasswordHasher } from '../../shared/security/PasswordHasher';
import { ValidationError } from '../../shared/errors';
import { isValidCpf, isValidEmail } from '../../shared/utils/validators';
import { Entity } from '../../shared/crud/Entity';

export const PAPEIS = ['USUARIO', 'ADMIN'] as const;
export type Papel = (typeof PAPEIS)[number];

export interface UsuarioProps {
  nome: string;
  email: string;
  senhaHash: string;
  cpf: string;
  /** Padrão: USUARIO. Só um administrador consegue alterar. */
  papel?: Papel;
}

export interface PerfilAtualizado {
  nome: string;
  cpf: string;
  senhaHash: string;
}

/** Alterações que só um administrador pode fazer. `senhaHash` null = manter a senha atual. */
export interface AlteracaoAdministrativa {
  nome: string;
  cpf: string;
  papel: Papel;
  senhaHash: string | null;
}

export class Usuario extends Entity<UsuarioProps> {
  readonly #nome: string;
  readonly #email: string;
  readonly #senhaHash: string;
  readonly #cpf: string;
  readonly #papel: Papel;

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
    this.#papel = props.papel ?? 'USUARIO';
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

  get papel(): Papel {
    return this.#papel;
  }

  get ehAdministrador(): boolean {
    return this.#papel === 'ADMIN';
  }

  /** O hash nunca sai da entidade: a conferência acontece aqui dentro. */
  autenticar(senha: string, hasher: PasswordHasher): Promise<boolean> {
    return hasher.compare(senha, this.#senhaHash);
  }

  /**
   * Regra de negócio: o e-mail é a identidade do usuário e NÃO pode ser alterado
   * (nem pelo próprio usuário, nem pelo administrador). Por isso não existe nenhum
   * método que receba um novo e-mail. O papel também é preservado aqui.
   */
  comPerfilAtualizado(perfil: PerfilAtualizado): Usuario {
    return new Usuario({ ...perfil, email: this.#email, papel: this.#papel }, this.id);
  }

  /** Edição feita por um administrador (inclui o papel e permite redefinir a senha). */
  comAlteracaoAdministrativa(alteracao: AlteracaoAdministrativa): Usuario {
    return new Usuario(
      {
        nome: alteracao.nome,
        cpf: alteracao.cpf,
        papel: alteracao.papel,
        senhaHash: alteracao.senhaHash ?? this.#senhaHash,
        email: this.#email,
      },
      this.id,
    );
  }

  comPapel(papel: Papel): Usuario {
    return new Usuario({ ...this.toProps(), papel }, this.id);
  }

  toProps(): UsuarioProps {
    return {
      nome: this.#nome,
      email: this.#email,
      senhaHash: this.#senhaHash,
      cpf: this.#cpf,
      papel: this.#papel,
    };
  }

  toJSON(): Record<string, unknown> {
    return { id: this.id, nome: this.#nome, email: this.#email, cpf: this.#cpf, papel: this.#papel };
  }
}
