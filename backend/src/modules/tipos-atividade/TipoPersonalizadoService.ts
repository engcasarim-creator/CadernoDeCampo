import type { TipoPersonalizadoRepository, UsoDeTipo } from './TipoPersonalizadoRepository';
import { TipoPersonalizado } from './TipoPersonalizado';
import { ConflictError, NotFoundError } from '../../shared/errors';
import type { Page } from '../../shared/types';
import { buildPage, parsePageRequest } from '../../shared/utils/pagination';
import type { CrudOperations } from '../../shared/crud/CrudService';

/**
 * CRUD dos tipos de atividade (uso do administrador). Implementa o mesmo contrato dos
 * outros recursos (`CrudOperations`), então reaproveita o controller e o roteador genéricos.
 * Os tipos valem para todos os usuários, por isso o `userId` não é usado aqui.
 */
export class TipoPersonalizadoService implements CrudOperations<TipoPersonalizado> {
  constructor(
    private readonly tipos: TipoPersonalizadoRepository,
    private readonly uso: UsoDeTipo,
  ) {}

  async list(_userId: number, query: Record<string, unknown>): Promise<Page<TipoPersonalizado>> {
    const request = parsePageRequest(query);
    return buildPage(await this.tipos.findPage(request), request);
  }

  /** Todos os tipos, sem paginar: alimenta o seletor de tipo de atividade dos usuários. */
  listarTodos(): Promise<TipoPersonalizado[]> {
    return this.tipos.findAll();
  }

  async get(_userId: number, id: number): Promise<TipoPersonalizado> {
    const tipo = await this.tipos.findById(id);
    if (!tipo) throw new NotFoundError('Tipo de atividade não encontrado');
    return tipo;
  }

  async create(_userId: number, raw: unknown): Promise<TipoPersonalizado> {
    const tipo = TipoPersonalizado.doCorpo(raw);
    await this.assertNomeLivre(tipo.nome, null);
    return this.tipos.create(tipo);
  }

  async update(userId: number, id: number, raw: unknown): Promise<TipoPersonalizado> {
    const atual = await this.get(userId, id);
    const novo = TipoPersonalizado.doCorpo(raw, id);
    await this.assertNomeLivre(novo.nome, id);

    // Mudar campos de um tipo que já tem atividades quebraria o cálculo dos custos já registrados.
    if (!atual.mesmosCamposQue(novo) && (await this.uso.existeAtividadeComTipo(id))) {
      throw new ConflictError('Este tipo já foi usado em atividades: só o nome pode ser alterado', {
        campos: 'Os campos não podem mudar depois que o tipo é usado',
      });
    }
    return this.tipos.update(novo);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.get(userId, id);
    if (await this.uso.existeAtividadeComTipo(id)) {
      throw new ConflictError('Não é possível excluir: existem atividades usando este tipo');
    }
    await this.tipos.delete(id);
  }

  private async assertNomeLivre(nome: string, idAtual: number | null): Promise<void> {
    const existente = await this.tipos.findByNome(nome);
    if (existente && existente.id !== idAtual) {
      throw new ConflictError('Já existe um tipo de atividade com este nome', { nome: 'Nome já cadastrado' });
    }
  }
}
