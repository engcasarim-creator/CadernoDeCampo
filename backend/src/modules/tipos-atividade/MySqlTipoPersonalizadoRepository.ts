import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { TipoPersonalizadoRepository } from './TipoPersonalizadoRepository';
import { TipoPersonalizado } from './TipoPersonalizado';
import type { PagedResult, PageRequest } from '../../shared/types';

function toTipo(row: RowDataPacket): TipoPersonalizado {
  return TipoPersonalizado.restaurar(Number(row.id), String(row.nome), row.campos);
}

export class MySqlTipoPersonalizadoRepository implements TipoPersonalizadoRepository {
  constructor(private readonly pool: Pool) {}

  async findPage(request: PageRequest): Promise<PagedResult<TipoPersonalizado>> {
    const [countRows] = await this.pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM tipos_atividade');
    const offset = (request.page - 1) * request.limit;
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM tipos_atividade ORDER BY nome ASC, id ASC LIMIT ? OFFSET ?',
      [request.limit, offset],
    );
    return { items: rows.map(toTipo), total: Number(countRows[0]?.total ?? 0) };
  }

  async findAll(): Promise<TipoPersonalizado[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM tipos_atividade ORDER BY nome ASC, id ASC');
    return rows.map(toTipo);
  }

  async findById(id: number): Promise<TipoPersonalizado | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM tipos_atividade WHERE id = ? LIMIT 1', [id]);
    const row = rows[0];
    return row ? toTipo(row) : null;
  }

  async findByNome(nome: string): Promise<TipoPersonalizado | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM tipos_atividade WHERE nome = ? LIMIT 1', [nome]);
    const row = rows[0];
    return row ? toTipo(row) : null;
  }

  async create(tipo: TipoPersonalizado): Promise<TipoPersonalizado> {
    const { nome, campos } = tipo.toProps();
    const [result] = await this.pool.query<ResultSetHeader>('INSERT INTO tipos_atividade (nome, campos) VALUES (?, ?)', [
      nome,
      JSON.stringify(campos),
    ]);
    return this.mustFind(result.insertId);
  }

  async update(tipo: TipoPersonalizado): Promise<TipoPersonalizado> {
    const id = tipo.id;
    if (id === null) throw new Error('Não é possível atualizar um tipo ainda não salvo');
    const { nome, campos } = tipo.toProps();
    await this.pool.query('UPDATE tipos_atividade SET nome = ?, campos = ? WHERE id = ?', [nome, JSON.stringify(campos), id]);
    return this.mustFind(id);
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM tipos_atividade WHERE id = ?', [id]);
  }

  private async mustFind(id: number): Promise<TipoPersonalizado> {
    const tipo = await this.findById(id);
    if (!tipo) throw new Error(`Tipo de atividade ${id} não encontrado após gravar`);
    return tipo;
  }
}
