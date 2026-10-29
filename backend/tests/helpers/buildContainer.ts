import type { Pool } from 'mysql2/promise';
import type { Container } from '../../src/container';
import { AuthController } from '../../src/controllers/AuthController';
import { ComparativoController } from '../../src/controllers/ComparativoController';
import { CrudController } from '../../src/controllers/CrudController';
import { UserController } from '../../src/controllers/UserController';
import { AtividadeFactory } from '../../src/entities/atividades/AtividadeFactory';
import type { Atividade, AtividadeProps } from '../../src/entities/atividades/Atividade';
import { Propriedade, type PropriedadeProps } from '../../src/entities/Propriedade';
import { Safra, type SafraProps } from '../../src/entities/Safra';
import { Talhao, type TalhaoProps } from '../../src/entities/Talhao';
import { Usuario } from '../../src/entities/Usuario';
import type { AreaPorPropriedade, UsuarioRepository } from '../../src/contracts/repositories';
import { BcryptPasswordHasher } from '../../src/security/BcryptPasswordHasher';
import { JwtTokenService } from '../../src/security/JwtTokenService';
import { AtividadeService } from '../../src/services/AtividadeService';
import { AuthService } from '../../src/services/AuthService';
import { ComparativoService } from '../../src/services/ComparativoService';
import { PropriedadeService } from '../../src/services/PropriedadeService';
import { SafraService } from '../../src/services/SafraService';
import { TalhaoService } from '../../src/services/TalhaoService';
import { UserService } from '../../src/services/UserService';
import { InMemoryRepository } from './InMemoryRepository';

class InMemoryUsuarios implements UsuarioRepository {
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
    const saved = new Usuario(usuario.toProps(), this.items.length + 1);
    this.items.push(saved);
    return saved;
  }
  async update(usuario: Usuario) {
    this.items[this.items.findIndex((u) => u.id === usuario.id)] = usuario;
    return usuario;
  }
}

/** Talhões em memória, com a mesma consulta de área que o MySQL faz com SUM(). */
class InMemoryTalhoes extends InMemoryRepository<Talhao, TalhaoProps> implements AreaPorPropriedade {
  async somaAreas(propriedadeId: number, ignorarTalhaoId: number | null): Promise<number> {
    return [...this.items.values()]
      .filter((talhao) => talhao.toProps().propriedadeId === propriedadeId && talhao.id !== ignorarTalhaoId)
      .reduce((soma, talhao) => soma + talhao.toProps().areaHa, 0);
  }
}

/** Monta a API real (rotas, middlewares, JWT, bcrypt) trocando só o MySQL por repositórios em memória. */
export function buildContainer(): Container {
  const hasher = new BcryptPasswordHasher(4); // custo baixo: testes rápidos
  const tokens = new JwtTokenService('segredo-de-teste', '1h');
  const usuarios = new InMemoryUsuarios();

  const propriedades = new InMemoryRepository<Propriedade, PropriedadeProps>(
    (props, id) => new Propriedade(props, id),
    (props) => props.usuarioId,
  );
  const talhoes = new InMemoryTalhoes(
    (props, id) => new Talhao(props, id),
    (props) => propriedades.items.get(props.propriedadeId)?.toProps().usuarioId,
  );
  const safras = new InMemoryRepository<Safra, SafraProps>(
    (props, id) => new Safra(props, id),
    (props) => {
      const talhao = talhoes.items.get(props.talhaoId);
      return talhao && propriedades.items.get(talhao.toProps().propriedadeId)?.toProps().usuarioId;
    },
  );
  const atividades = new InMemoryRepository<Atividade, AtividadeProps>(
    (props, id) => AtividadeFactory.criar(props.tipo, props, props.detalhes, id),
    (props) => {
      const safra = safras.items.get(props.safraId);
      const talhao = safra && talhoes.items.get(safra.toProps().talhaoId);
      return talhao && propriedades.items.get(talhao.toProps().propriedadeId)?.toProps().usuarioId;
    },
  );

  return {
    pool: { query: async () => [[], []] } as unknown as Pool,
    tokens,
    authController: new AuthController(new AuthService(usuarios, hasher, tokens)),
    userController: new UserController(new UserService(usuarios, hasher)),
    propriedadeController: new CrudController(new PropriedadeService(propriedades, talhoes)),
    talhaoController: new CrudController(new TalhaoService(talhoes, propriedades)),
    safraController: new CrudController(new SafraService(safras, talhoes)),
    atividadeController: new CrudController(new AtividadeService(atividades, safras)),
    comparativoController: new ComparativoController(new ComparativoService(atividades, safras)),
  } as unknown as Container;
}
