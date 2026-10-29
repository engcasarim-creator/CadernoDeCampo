import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { ScopedRepository } from '../contracts/repositories';
import type { Entity } from '../entities/Entity';
import type { PagedResult, PageRequest, QueryFilter } from '../types';

const IDENTIFIER = /^[a-z_]+$/;

/**
 * Repositório genérico (Generics): implementa o CRUD uma única vez para qualquer entidade.
 * Cada subclasse só informa a tabela, como chegar ao dono (usuário) e como converter linha <-> entidade.
 *
 * Os nomes de tabela/coluna vêm SEMPRE do código (nunca do usuário) e os valores
 * são sempre parametrizados, então não há risco de SQL injection.
 */
export abstract class BaseRepository<T extends Entity<P>, P extends object> implements ScopedRepository<T> {
  protected abstract readonly table: string;
  /** Alias da tabela nas consultas (ex.: "t"). */
  protected abstract readonly alias: string;
  /** JOINs necessários para chegar até o usuário dono do registro ('' se a tabela já tem usuario_id). */
  protected abstract readonly joins: string;
  /** Coluna que contém o id do usuário dono (ex.: "p.usuario_id"). */
  protected abstract readonly ownerColumn: string;

  protected abstract fromRow(row: RowDataPacket): T;
  /** Converte as props da entidade em colunas do banco (snake_case). */
  protected abstract toColumns(props: P): Record<string, unknown>;

  constructor(protected readonly pool: Pool) {}

  async findPage(userId: number, request: PageRequest, filter: QueryFilter | null): Promise<PagedResult<T>> {
    const conditions = [`${this.ownerColumn} = ?`];
    const params: Array<string | number> = [userId];
    if (filter) {
      if (!IDENTIFIER.test(filter.column)) throw new Error('Coluna de filtro inválida');
      conditions.push(`${this.alias}.${filter.column} = ?`);
      params.push(filter.value);
    }
    const from = `FROM ${this.table} ${this.alias} ${this.joins} WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await this.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from}`, params);
    const total = Number(countRows[0]?.total ?? 0);

    const offset = (request.page - 1) * request.limit;
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${this.alias}.* ${from} ORDER BY ${this.alias}.id DESC LIMIT ? OFFSET ?`,
      [...params, request.limit, offset],
    );
    return { items: rows.map((row) => this.fromRow(row)), total };
  }

  async findById(userId: number, id: number): Promise<T | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${this.alias}.* FROM ${this.table} ${this.alias} ${this.joins}
       WHERE ${this.ownerColumn} = ? AND ${this.alias}.id = ?`,
      [userId, id],
    );
    const row = rows[0];
    return row ? this.fromRow(row) : null;
  }

  async create(entity: T): Promise<T> {
    const [result] = await this.pool.query<ResultSetHeader>(`INSERT INTO ${this.table} SET ?`, [
      this.toColumns(entity.toProps()),
    ]);
    return this.findRawById(result.insertId);
  }

  async update(entity: T): Promise<T> {
    const id = entity.id;
    if (id === null) throw new Error('Não é possível atualizar uma entidade ainda não salva');
    await this.pool.query(`UPDATE ${this.table} SET ? WHERE id = ?`, [this.toColumns(entity.toProps()), id]);
    return this.findRawById(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
  }

  protected async findRawById(id: number): Promise<T> {
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    const row = rows[0];
    if (!row) throw new Error(`Registro ${id} não encontrado em ${this.table}`);
    return this.fromRow(row);
  }
}
