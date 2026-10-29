import type { PasswordHasher } from '../contracts/PasswordHasher';
import type { UsuarioRepository } from '../contracts/repositories';
import type { Usuario } from '../entities/Usuario';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors';
import { BodyReader } from '../utils/BodyReader';

export class UserService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async obter(id: number): Promise<Usuario> {
    const usuario = await this.usuarios.findById(id);
    if (!usuario) throw new NotFoundError('Usuário não encontrado');
    return usuario;
  }

  /**
   * Edição do perfil. Regras:
   *  - só o próprio usuário pode se editar (403 caso contrário);
   *  - nome, CPF e senha são obrigatórios (e validados);
   *  - o e-mail não pode ser alterado.
   */
  async atualizar(usuarioLogadoId: number, alvoId: number, raw: unknown): Promise<Usuario> {
    if (usuarioLogadoId !== alvoId) {
      throw new ForbiddenError('Você só pode editar o seu próprio usuário');
    }
    const atual = await this.obter(alvoId);

    const reader = new BodyReader(raw);
    const nome = reader.string('nome', 120);
    const cpf = reader.cpf('cpf');
    const senha = reader.password('senha');
    const emailInformado = reader.raw('email');
    reader.finish();

    if (emailInformado !== undefined && String(emailInformado).trim().toLowerCase() !== atual.email) {
      throw new ValidationError('Não é permitido alterar o e-mail', { email: 'O e-mail não pode ser alterado' });
    }

    const donoDoCpf = await this.usuarios.findByCpf(cpf);
    if (donoDoCpf && donoDoCpf.id !== atual.id) {
      throw new ConflictError('Este CPF já está cadastrado', { cpf: 'CPF já cadastrado' });
    }

    const senhaHash = await this.hasher.hash(senha);
    return this.usuarios.update(atual.comPerfilAtualizado({ nome, cpf, senhaHash }));
  }
}
