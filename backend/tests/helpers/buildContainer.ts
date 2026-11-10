import type { AdminSeed } from '../../src/config/env';
import type { Container } from '../../src/container';
import { createModulos } from '../../src/modules';
import {
  Contestacao,
  type ContestacaoProps,
  type ContestacaoRepository,
  type DecisaoDeContestacao,
  type StatusDoEmail,
  type NovaContestacao,
  type NovoArquivo,
  type StatusDeContestacao,
} from '../../src/modules/contestacoes';
import type { Notificacao, NotificacaoRepository } from '../../src/modules/notificacoes';
import type { Email, EmailSender, ResultadoDoEmail } from '../../src/shared/email';
import type { ArmazenamentoDeArquivos } from '../../src/shared/storage';
import { AtividadeFactory } from '../../src/modules/atividades';
import type { Atividade, AtividadeProps } from '../../src/modules/atividades';
import { Propriedade, type PropriedadeProps } from '../../src/modules/propriedades';
import type {
  AdministracaoDePropriedades,
  AreaPorPropriedade,
  PropriedadeComResponsavel,
  PropriedadeRegistrada,
  RegistroDePropriedades,
  Transferencia,
} from '../../src/modules/propriedades';
import { normalizarCar, normalizarCcir } from '../../src/modules/propriedades/identificadores';
import { ConflictError } from '../../src/shared/errors';
import { Safra, type SafraProps } from '../../src/modules/safras';
import { Talhao, type TalhaoProps } from '../../src/modules/talhoes';
import { TipoPersonalizado } from '../../src/modules/tipos-atividade';
import type { TipoPersonalizadoRepository, UsoDeTipo } from '../../src/modules/tipos-atividade';
import { garantirAdministrador, Usuario } from '../../src/modules/usuarios';
import type { UsuarioRepository } from '../../src/modules/usuarios';
import { BcryptPasswordHasher } from '../../src/shared/security/BcryptPasswordHasher';
import { JwtTokenService } from '../../src/shared/security/JwtTokenService';
import type { PagedResult, PageRequest } from '../../src/shared/types';
import type { CaixaGeografica } from '../../src/shared/utils/geo';
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
  async findPage(request: PageRequest): Promise<PagedResult<Usuario>> {
    const ordenados = [...this.items].sort((a, b) => a.nome.localeCompare(b.nome) || (a.id ?? 0) - (b.id ?? 0));
    const inicio = (request.page - 1) * request.limit;
    return { items: ordenados.slice(inicio, inicio + request.limit), total: ordenados.length };
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

/** Tipos personalizados em memória (nome único sem diferenciar maiúsculas, como no MySQL). */
class InMemoryTipos implements TipoPersonalizadoRepository {
  readonly items = new Map<number, TipoPersonalizado>();
  #nextId = 1;

  async findPage(request: PageRequest): Promise<PagedResult<TipoPersonalizado>> {
    const todos = await this.findAll();
    const inicio = (request.page - 1) * request.limit;
    return { items: todos.slice(inicio, inicio + request.limit), total: todos.length };
  }
  async findAll() {
    return [...this.items.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }
  async findById(id: number) {
    return this.items.get(id) ?? null;
  }
  async findByNome(nome: string) {
    return [...this.items.values()].find((t) => t.nome.toLowerCase() === nome.toLowerCase()) ?? null;
  }
  async create(tipo: TipoPersonalizado) {
    const id = this.#nextId++;
    const salvo = TipoPersonalizado.restaurar(
      id,
      tipo.nome,
      tipo.toProps().campos,
    );
    this.items.set(id, salvo);
    return salvo;
  }
  async update(tipo: TipoPersonalizado) {
    this.items.set(tipo.id as number, tipo);
    return tipo;
  }
  async delete(id: number) {
    this.items.delete(id);
  }
}

/** Propriedades em memória, com as consultas globais usadas para detectar duplicidade. */
class InMemoryPropriedades extends InMemoryRepository<Propriedade, PropriedadeProps> implements RegistroDePropriedades {
  #registrada(p: Propriedade): PropriedadeRegistrada {
    const props = p.toProps();
    return { id: p.id as number, usuarioId: props.usuarioId, nome: props.nome, latitude: props.latitude, longitude: props.longitude };
  }
  async buscarPorCar(car: string) {
    const achada = [...this.items.values()].find((p) => p.toProps().car === car);
    return achada ? this.#registrada(achada) : null;
  }
  async buscarPorCcir(ccir: string) {
    const achada = [...this.items.values()].find((p) => p.toProps().ccir === ccir);
    return achada ? this.#registrada(achada) : null;
  }
  async buscarNaCaixa(caixa: CaixaGeografica) {
    return [...this.items.values()]
      .filter((p) => {
        const { latitude, longitude } = p.toProps();
        return (
          latitude !== null && longitude !== null &&
          latitude >= caixa.latMin && latitude <= caixa.latMax && longitude >= caixa.lngMin && longitude <= caixa.lngMax
        );
      })
      .map((p) => this.#registrada(p));
  }
}

/** Visão de administrador em memória: junta propriedades e usuários e guarda o histórico de trocas. */
class InMemoryAdminPropriedades implements AdministracaoDePropriedades {
  readonly transferencias: Transferencia[] = [];
  #proximoId = 1;

  constructor(
    private readonly propriedades: InMemoryPropriedades,
    private readonly usuarios: InMemoryUsuarios,
  ) {}

  #modelo(p: Propriedade): PropriedadeComResponsavel {
    const dono = this.usuarios.items.find((u) => u.id === p.toProps().usuarioId) as Usuario;
    return { propriedade: p, responsavel: { id: dono.id as number, nome: dono.nome, email: dono.email, cpf: dono.cpf } };
  }

  async listar(request: PageRequest, busca: string | null): Promise<PagedResult<PropriedadeComResponsavel>> {
    let todas = [...this.propriedades.items.values()].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).map((p) => this.#modelo(p));
    if (busca !== null) {
      const texto = busca.toLowerCase();
      todas = todas.filter(({ propriedade, responsavel }) => {
        const { nome, municipio, car, ccir } = propriedade.toProps();
        return (
          [nome, municipio, responsavel.nome, responsavel.email].some((campo) => campo.toLowerCase().includes(texto)) ||
          (car !== null && car.includes(normalizarCar(busca))) ||
          (ccir !== null && ccir.includes(normalizarCcir(busca)))
        );
      });
    }
    const inicio = (request.page - 1) * request.limit;
    return { items: todas.slice(inicio, inicio + request.limit), total: todas.length };
  }

  async buscarPorId(id: number) {
    const p = this.propriedades.items.get(id);
    return p ? this.#modelo(p) : null;
  }

  async listarTransferencias(propriedadeId: number) {
    return this.transferencias.filter((t) => t.propriedadeId === propriedadeId).sort((a, b) => b.id - a.id);
  }

  async transferir(t: Parameters<AdministracaoDePropriedades['transferir']>[0]) {
    const p = this.propriedades.items.get(t.propriedadeId);
    if (!p || p.toProps().usuarioId !== t.deUsuarioId) throw new ConflictError('O responsável por esta propriedade mudou.');
    this.propriedades.items.set(t.propriedadeId, new Propriedade({ ...p.toProps(), usuarioId: t.paraUsuarioId }, t.propriedadeId));
    const nome = (id: number) => this.usuarios.items.find((u) => u.id === id) as Usuario;
    const resumo = (id: number) => ({ id, nome: nome(id).nome, email: nome(id).email });
    this.transferencias.push({
      id: this.#proximoId++,
      propriedadeId: t.propriedadeId,
      de: resumo(t.deUsuarioId),
      para: resumo(t.paraUsuarioId),
      realizadaPor: { id: t.adminId, nome: nome(t.adminId).nome },
      motivo: t.motivo,
      realizadaEm: new Date().toISOString(),
    });
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

class InMemoryAtividades extends InMemoryRepository<Atividade, AtividadeProps> implements UsoDeTipo {
  async existeAtividadeComTipo(tipoId: number): Promise<boolean> {
    return [...this.items.values()].some((atividade) => atividade.tipoId === tipoId);
  }
}

/** Contestações em memória (mesma "reserva" da decisão que o UPDATE condicional do MySQL faz). */
export class InMemoryContestacoes implements ContestacaoRepository {
  readonly #dados = new Map<number, ContestacaoProps>();
  #proximoId = 1;
  #proximoArquivo = 1;

  #modelo(id: number): Contestacao | null {
    const props = this.#dados.get(id);
    return props ? new Contestacao({ ...props }, id) : null;
  }
  #atualizar(id: number, mudancas: Partial<ContestacaoProps>) {
    this.#dados.set(id, { ...(this.#dados.get(id) as ContestacaoProps), ...mudancas });
  }
  get todas(): Contestacao[] {
    return [...this.#dados.keys()].map((id) => this.#modelo(id) as Contestacao);
  }

  async criar(nova: NovaContestacao, arquivos: NovoArquivo[]) {
    const id = this.#proximoId++;
    this.#dados.set(id, {
      ...nova,
      status: 'EM_ANALISE',
      decisao: null,
      decididaPor: null,
      decididaEm: null,
      emailStatus: null,
      criadaEm: new Date().toISOString(),
      arquivos: arquivos.map((a) => ({ ...a, id: this.#proximoArquivo++, enviadoEm: new Date().toISOString() })),
    });
    return this.#modelo(id) as Contestacao;
  }
  async buscarPorId(id: number) {
    return this.#modelo(id);
  }
  async buscarEmAnalise(solicitanteId: number, propriedadeId: number) {
    return (
      this.todas.find((c) => c.solicitanteId === solicitanteId && c.propriedadeId === propriedadeId && c.estaEmAnalise()) ??
      null
    );
  }
  async listarDoSolicitante(solicitanteId: number, request: PageRequest) {
    const todas = this.todas.filter((c) => c.solicitanteId === solicitanteId).sort((a, b) => b.id - a.id);
    const inicio = (request.page - 1) * request.limit;
    return { items: todas.slice(inicio, inicio + request.limit), total: todas.length };
  }
  async listarTodas(request: PageRequest, status: StatusDeContestacao | null) {
    const todas = this.todas
      .filter((c) => status === null || c.status === status)
      .sort((a, b) => (status === 'EM_ANALISE' ? a.id - b.id : b.id - a.id));
    const inicio = (request.page - 1) * request.limit;
    return { items: todas.slice(inicio, inicio + request.limit), total: todas.length };
  }
  async decidir(id: number, adminId: number, decisao: DecisaoDeContestacao, motivo: string) {
    if (!this.#modelo(id)?.estaEmAnalise()) return false;
    this.#atualizar(id, {
      status: decisao,
      decisao: motivo,
      decididaPor: adminId,
      decididaEm: new Date().toISOString(),
      emailStatus: 'PENDENTE',
    });
    return true;
  }
  async reabrir(id: number) {
    this.#atualizar(id, { status: 'EM_ANALISE', decisao: null, decididaPor: null, decididaEm: null, emailStatus: null });
  }
  async registrarEmail(id: number, status: StatusDoEmail) {
    this.#atualizar(id, { emailStatus: status });
  }
}

export class InMemoryNotificacoes implements NotificacaoRepository {
  readonly items: Notificacao[] = [];
  async criar(n: { usuarioId: number; titulo: string; mensagem: string }) {
    this.items.push({ ...n, id: this.items.length + 1, lida: false, criadaEm: new Date().toISOString() });
  }
  async listar(usuarioId: number, request: PageRequest) {
    const todas = this.items.filter((n) => n.usuarioId === usuarioId).sort((a, b) => b.id - a.id);
    const inicio = (request.page - 1) * request.limit;
    return { items: todas.slice(inicio, inicio + request.limit), total: todas.length };
  }
  async contarNaoLidas(usuarioId: number) {
    return this.items.filter((n) => n.usuarioId === usuarioId && !n.lida).length;
  }
  async marcarLida(id: number, usuarioId: number) {
    const n = this.items.find((x) => x.id === id && x.usuarioId === usuarioId);
    if (n) n.lida = true;
    return n !== undefined;
  }
  async marcarTodasLidas(usuarioId: number) {
    this.items.filter((n) => n.usuarioId === usuarioId).forEach((n) => (n.lida = true));
  }
}

/** Guarda os e-mails "enviados" para os testes conferirem; `resultado` simula SMTP fora do ar. */
export class EmailEmMemoria implements EmailSender {
  readonly enviados: Email[] = [];
  resultado: ResultadoDoEmail = 'ENVIADO';
  async enviar(email: Email) {
    if (this.resultado === 'ENVIADO') this.enviados.push(email);
    return this.resultado;
  }
}

export class ArmazenamentoEmMemoria implements ArmazenamentoDeArquivos {
  readonly arquivos = new Map<string, Buffer>();
  async salvar(chave: string, conteudo: Buffer) {
    this.arquivos.set(chave, conteudo);
  }
  async ler(chave: string) {
    const conteudo = this.arquivos.get(chave);
    if (!conteudo) throw new Error('não existe');
    return conteudo;
  }
  async remover(chave: string) {
    this.arquivos.delete(chave);
  }
}

export interface BuildContainerOptions {
  /** Administrador criado ao chamar `container.iniciar()` (como a API faz ao subir). */
  admin?: AdminSeed;
  /** Peças trocáveis pelos testes (e-mail, armazenamento, repositório de contestações...). */
  email?: EmailSender;
  arquivos?: ArmazenamentoDeArquivos;
  contestacoes?: ContestacaoRepository;
  /** Permite trocar/embrulhar a visão de administrador das propriedades (ex.: simular falha na transferência). */
  envolverAdminPropriedades?: (base: AdministracaoDePropriedades) => AdministracaoDePropriedades;
}

/** Monta a API real (rotas, middlewares, JWT, bcrypt) trocando só o MySQL por repositórios em memória. */
export function buildContainer(options: BuildContainerOptions = {}): Container {
  const hasher = new BcryptPasswordHasher(4); // custo baixo: testes rápidos
  const tokens = new JwtTokenService('segredo-de-teste', '1h');
  const usuarios = new InMemoryUsuarios();
  const tipos = new InMemoryTipos();

  const propriedades = new InMemoryPropriedades(
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
  const atividades = new InMemoryAtividades(
    (props, id) =>
      AtividadeFactory.criar(props.tipo, props, props.detalhes, id, props.tipoId === null ? null : (tipos.items.get(props.tipoId) ?? null)),
    (props) => {
      const safra = safras.items.get(props.safraId);
      const talhao = safra && talhoes.items.get(safra.toProps().talhaoId);
      return talhao && propriedades.items.get(talhao.toProps().propriedadeId)?.toProps().usuarioId;
    },
  );

  return {
    pool: { query: async () => [[], []] } as unknown as Container['pool'],
    // Mesmos módulos/rotas da produção; só os repositórios são em memória.
    routers: createModulos({
      hasher,
      tokens,
      usuarios,
      propriedades,
      propriedadesAdmin: (options.envolverAdminPropriedades ?? ((base) => base))(
        new InMemoryAdminPropriedades(propriedades, usuarios),
      ),
      talhoes,
      safras,
      atividades,
      tipos,
      contestacoes: options.contestacoes ?? new InMemoryContestacoes(),
      notificacoes: new InMemoryNotificacoes(),
      email: options.email ?? new EmailEmMemoria(),
      arquivos: options.arquivos ?? new ArmazenamentoEmMemoria(),
    }),
    iniciar: async () => {
      if (options.admin) await garantirAdministrador(usuarios, hasher, options.admin, () => undefined);
    },
  };
}
