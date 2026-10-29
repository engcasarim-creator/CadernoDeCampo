import { describe, expect, it } from 'vitest';
import type { PasswordHasher } from '../src/contracts/PasswordHasher';
import type { UsuarioRepository } from '../src/contracts/repositories';
import type { TokenService } from '../src/contracts/TokenService';
import { Usuario } from '../src/entities/Usuario';
import { ConflictError, UnauthorizedError, ValidationError } from '../src/errors';
import { AuthService } from '../src/services/AuthService';
import { UserService } from '../src/services/UserService';
import { ForbiddenError } from '../src/errors';

/** Dublês em memória: provam que os services dependem de contratos, não do MySQL/bcrypt/JWT. */
class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash:${plain}`;
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hash:${plain}`;
  }
}

class FakeTokens implements TokenService {
  sign(payload: { sub: number; email: string }): string {
    return `token-${payload.sub}`;
  }
  verify(): { sub: number; email: string } {
    throw new UnauthorizedError('não usado');
  }
}

class FakeUsuarios implements UsuarioRepository {
  readonly items: Usuario[] = [];
  async findById(id: number) {
    return this.items.find((u) => u.id === id) ?? null;
  }
  async findByEmail(email: string) {
    return this.items.find((u) => u.email === email) ?? null;
  }
  async findByCpf(cpf: string) {
    return this.items.find((u) => u.cpf === cpf) ?? null;
  }
  async create(usuario: Usuario) {
    const salvo = new Usuario(usuario.toProps(), this.items.length + 1);
    this.items.push(salvo);
    return salvo;
  }
  async update(usuario: Usuario) {
    const index = this.items.findIndex((u) => u.id === usuario.id);
    this.items[index] = usuario;
    return usuario;
  }
}

const cadastro = { nome: 'Renan', email: 'Renan@Exemplo.com', senha: 'Senha@123', cpf: '529.982.247-25' };

function criarServicos() {
  const repo = new FakeUsuarios();
  const hasher = new FakeHasher();
  return { repo, auth: new AuthService(repo, hasher, new FakeTokens()), users: new UserService(repo, hasher) };
}

describe('AuthService', () => {
  it('cadastra, normaliza e-mail/CPF e nunca devolve a senha', async () => {
    const { auth } = criarServicos();
    const usuario = await auth.register(cadastro);
    expect(usuario.toJSON()).toEqual({ id: 1, nome: 'Renan', email: 'renan@exemplo.com', cpf: '52998224725' });
  });

  it('rejeita senha fraca, CPF inválido e e-mail inválido', async () => {
    const { auth } = criarServicos();
    await expect(auth.register({ ...cadastro, senha: 'fraca' })).rejects.toBeInstanceOf(ValidationError);
    await expect(auth.register({ ...cadastro, cpf: '111.111.111-11' })).rejects.toBeInstanceOf(ValidationError);
    await expect(auth.register({ ...cadastro, email: 'invalido' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('não permite e-mail ou CPF duplicado', async () => {
    const { auth } = criarServicos();
    await auth.register(cadastro);
    await expect(auth.register(cadastro)).rejects.toBeInstanceOf(ConflictError);
  });

  it('faz login só com usuário existente e senha correta', async () => {
    const { auth } = criarServicos();
    await auth.register(cadastro);
    const { token } = await auth.login({ email: 'renan@exemplo.com', senha: 'Senha@123' });
    expect(token).toBe('token-1');
    await expect(auth.login({ email: 'renan@exemplo.com', senha: 'errada' })).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(auth.login({ email: 'ninguem@exemplo.com', senha: 'Senha@123' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

describe('UserService', () => {
  it('só permite editar o próprio usuário', async () => {
    const { auth, users } = criarServicos();
    await auth.register(cadastro);
    const edicao = { nome: 'Novo Nome', cpf: '529.982.247-25', senha: 'Outra@1234' };
    await expect(users.atualizar(2, 1, edicao)).rejects.toBeInstanceOf(ForbiddenError);
    const atualizado = await users.atualizar(1, 1, edicao);
    expect(atualizado.nome).toBe('Novo Nome');
  });

  it('não permite alterar o e-mail', async () => {
    const { auth, users } = criarServicos();
    await auth.register(cadastro);
    const edicao = { nome: 'Renan', cpf: '529.982.247-25', senha: 'Senha@123', email: 'outro@exemplo.com' };
    await expect(users.atualizar(1, 1, edicao)).rejects.toBeInstanceOf(ValidationError);
  });

  it('exige todos os campos na edição', async () => {
    const { auth, users } = criarServicos();
    await auth.register(cadastro);
    await expect(users.atualizar(1, 1, { nome: 'Renan' })).rejects.toBeInstanceOf(ValidationError);
  });
});
