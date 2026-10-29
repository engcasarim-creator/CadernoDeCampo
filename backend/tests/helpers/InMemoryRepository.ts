import type { ScopedRepository } from '../../src/contracts/repositories';
import type { Entity } from '../../src/entities/Entity';
import type { PagedResult, PageRequest, QueryFilter } from '../../src/types';

const toCamel = (column: string): string => column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Repositório em memória que respeita "posse" por usuário, como o MySQL faria com os JOINs. */
export class InMemoryRepository<T extends Entity<P>, P extends object> implements ScopedRepository<T> {
  readonly items = new Map<number, T>();
  #nextId = 1;

  constructor(
    private readonly rebuild: (props: P, id: number) => T,
    /** Descobre o dono (usuário) a partir das props; undefined = pai inexistente. */
    private readonly ownerOf: (props: P) => number | undefined,
  ) {}

  #ownedBy(userId: number): T[] {
    return [...this.items.values()].filter((item) => this.ownerOf(item.toProps()) === userId);
  }

  async findPage(userId: number, request: PageRequest, filter: QueryFilter | null): Promise<PagedResult<T>> {
    let owned = this.#ownedBy(userId).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    if (filter) {
      const key = toCamel(filter.column);
      owned = owned.filter((item) => (item.toProps() as Record<string, unknown>)[key] === filter.value);
    }
    const start = (request.page - 1) * request.limit;
    return { items: owned.slice(start, start + request.limit), total: owned.length };
  }

  async findById(userId: number, id: number): Promise<T | null> {
    return this.#ownedBy(userId).find((item) => item.id === id) ?? null;
  }

  async create(entity: T): Promise<T> {
    const saved = this.rebuild(entity.toProps(), this.#nextId++);
    this.items.set(saved.id as number, saved);
    return saved;
  }

  async update(entity: T): Promise<T> {
    const saved = this.rebuild(entity.toProps(), entity.id as number);
    this.items.set(saved.id as number, saved);
    return saved;
  }

  async delete(id: number): Promise<void> {
    this.items.delete(id);
  }
}
