import type { ScopedRepository } from '../contracts/repositories';
import type { Entity } from '../entities/Entity';
import { NotFoundError, ValidationError } from '../errors';
import type { Page, QueryFilter } from '../types';
import { buildPage, parsePageRequest } from '../utils/pagination';

/** O que o controller genérico precisa de um service (Segregação de Interfaces). */
export interface CrudOperations<T extends Entity<object>> {
  list(userId: number, query: Record<string, unknown>): Promise<Page<T>>;
  get(userId: number, id: number): Promise<T>;
  create(userId: number, raw: unknown): Promise<T>;
  update(userId: number, id: number, raw: unknown): Promise<T>;
  remove(userId: number, id: number): Promise<void>;
}

/**
 * Template Method: o fluxo do CRUD é igual para todos os recursos;
 * cada subclasse só diz COMO montar a entidade (`build`), qual o nome do recurso
 * (para as mensagens) e, se houver, como validar o "pai" (`assertParents`).
 */
export abstract class CrudService<T extends Entity<object>> implements CrudOperations<T> {
  /** Nome do recurso para mensagens de erro, ex.: "Talhão". */
  protected abstract readonly nomeRecurso: string;
  /** Filtros aceitos na listagem: parâmetro da query -> coluna (ex.: { propriedadeId: 'propriedade_id' }). */
  protected readonly filtros: Readonly<Record<string, string>> = {};

  constructor(protected readonly repository: ScopedRepository<T>) {}

  /** Valida o corpo da requisição e devolve a entidade pronta (id = null ao criar). */
  protected abstract build(userId: number, raw: unknown, id: number | null): T;

  /** Garante que os registros "pai" existem e pertencem ao usuário. */
  protected async assertParents(_userId: number, _entity: T): Promise<void> {
    // por padrão, recurso sem pai
  }

  /** Regras de negócio que dependem de outros registros (ex.: soma das áreas). Roda após `assertParents`. */
  protected async assertBusinessRules(_userId: number, _entity: T): Promise<void> {
    // por padrão, sem regras extras
  }

  async list(userId: number, query: Record<string, unknown>): Promise<Page<T>> {
    const request = parsePageRequest(query);
    const result = await this.repository.findPage(userId, request, this.readFilter(query));
    return buildPage(result, request);
  }

  async get(userId: number, id: number): Promise<T> {
    const entity = await this.repository.findById(userId, id);
    if (!entity) throw new NotFoundError(`${this.nomeRecurso} não encontrado(a)`);
    return entity;
  }

  async create(userId: number, raw: unknown): Promise<T> {
    const entity = this.build(userId, raw, null);
    await this.assertParents(userId, entity);
    await this.assertBusinessRules(userId, entity);
    return this.repository.create(entity);
  }

  async update(userId: number, id: number, raw: unknown): Promise<T> {
    await this.get(userId, id); // 404 se não existir (ou se for de outro usuário)
    const entity = this.build(userId, raw, id);
    await this.assertParents(userId, entity);
    await this.assertBusinessRules(userId, entity);
    return this.repository.update(entity);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.get(userId, id); // 404 se não existir (ou se for de outro usuário)
    await this.repository.delete(id);
  }

  private readFilter(query: Record<string, unknown>): QueryFilter | null {
    for (const [param, column] of Object.entries(this.filtros)) {
      const value = query[param];
      if (value === undefined || value === '') continue;
      const parsed = typeof value === 'string' ? Number(value) : NaN;
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new ValidationError(`Filtro "${param}" inválido`, { [param]: 'Deve ser um inteiro positivo' });
      }
      return { column, value: parsed };
    }
    return null;
  }
}
