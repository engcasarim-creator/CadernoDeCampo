/** Contrato de hash de senha (Inversão de Dependência: o domínio não conhece o bcrypt). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
