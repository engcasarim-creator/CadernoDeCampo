import type { PasswordHasher } from '../../shared/security/PasswordHasher';
import type { UsuarioRepository } from './UsuarioRepository';
import { PAPEIS, type Usuario } from './Usuario';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import type { Page } from '../../shared/types';
import { BodyReader } from '../../shared/utils/BodyReader';
import { buildPage, parsePageRequest } from '../../shared/utils/pagination';

function foiInformado(valor: unknown): boolean {
  return typeof valor === 'string' ? valor !== '' : valor !== undefined && valor !== null;
}

/** Gestão de usuários pelo administrador: listar, consultar e alterar dados. Nunca expõe a senha. */
export class AdminUsuarioService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async listar(query: Record<string, unknown>): Promise<Page<Usuario>> {
    const request = parsePageRequest(query);
    return buildPage(await this.usuarios.findPage(request), request);
  }

  async obter(id: number): Promise<Usuario> {
    const usuario = await this.usuarios.findById(id);
    if (!usuario) throw new NotFoundError('Usuário não encontrado');
    return usuario;
  }

  /**
   * Regras:
   *  - nome, CPF e papel são obrigatórios e validados;
   *  - a senha só muda se uma nova for informada (e precisa ser forte);
   *  - o e-mail NÃO pode ser alterado (identidade do usuário);
   *  - o administrador não pode remover o próprio acesso (evita ficar sem nenhum admin).
   */
  async atualizar(adminId: number, alvoId: number, raw: unknown): Promise<Usuario> {
    const atual = await this.obter(alvoId);

    const reader = new BodyReader(raw);
    const nome = reader.string('nome', 120);
    const cpf = reader.cpf('cpf');
    const papel = reader.oneOf('papel', PAPEIS);
    const novaSenha = foiInformado(reader.raw('senha')) ? reader.password('senha') : null;
    const emailInformado = reader.raw('email');
    reader.finish();

    if (emailInformado !== undefined && String(emailInformado).trim().toLowerCase() !== atual.email) {
      throw new ValidationError('Não é permitido alterar o e-mail', { email: 'O e-mail não pode ser alterado' });
    }
    if (adminId === alvoId && papel !== 'ADMIN') {
      throw new ValidationError('Você não pode remover o seu próprio acesso de administrador', {
        papel: 'Peça a outro administrador para alterar o seu papel',
      });
    }
    const donoDoCpf = await this.usuarios.findByCpf(cpf);
    if (donoDoCpf && donoDoCpf.id !== atual.id) {
      throw new ConflictError('Este CPF já está cadastrado', { cpf: 'CPF já cadastrado' });
    }

    const senhaHash = novaSenha === null ? null : await this.hasher.hash(novaSenha);
    return this.usuarios.update(atual.comAlteracaoAdministrativa({ nome, cpf, papel, senhaHash }));
  }
}
