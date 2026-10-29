import type { PasswordHasher } from '../contracts/PasswordHasher';
import type { UsuarioRepository } from '../contracts/repositories';
import type { TokenService } from '../contracts/TokenService';
import { Usuario } from '../entities/Usuario';
import { ConflictError, UnauthorizedError } from '../errors';
import { BodyReader } from '../utils/BodyReader';

export interface LoginResult {
  token: string;
  usuario: Usuario;
}

/** Responsabilidade única: cadastro e login. Depende só de contratos (interfaces). */
export class AuthService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(raw: unknown): Promise<Usuario> {
    const reader = new BodyReader(raw);
    const nome = reader.string('nome', 120);
    const email = reader.email('email');
    const senha = reader.password('senha');
    const cpf = reader.cpf('cpf');
    reader.finish();

    if (await this.usuarios.findByEmail(email)) {
      throw new ConflictError('Este e-mail já está cadastrado', { email: 'E-mail já cadastrado' });
    }
    if (await this.usuarios.findByCpf(cpf)) {
      throw new ConflictError('Este CPF já está cadastrado', { cpf: 'CPF já cadastrado' });
    }

    const senhaHash = await this.hasher.hash(senha);
    return this.usuarios.create(new Usuario({ nome, email, senhaHash, cpf }));
  }

  async login(raw: unknown): Promise<LoginResult> {
    const reader = new BodyReader(raw);
    const email = reader.email('email');
    const senha = reader.passwordAny('senha');
    reader.finish();

    const usuario = await this.usuarios.findByEmail(email);
    // Mesma mensagem para "usuário não existe" e "senha errada": não revela quais e-mails existem.
    const credenciaisValidas = usuario !== null && (await usuario.autenticar(senha, this.hasher));
    if (!usuario || usuario.id === null || !credenciaisValidas) {
      throw new UnauthorizedError('E-mail ou senha inválidos');
    }

    const token = this.tokens.sign({ sub: usuario.id, email: usuario.email });
    return { token, usuario };
  }
}
