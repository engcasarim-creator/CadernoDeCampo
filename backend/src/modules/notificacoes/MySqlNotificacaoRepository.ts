import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { PagedResult, PageRequest } from '../../shared/types';
import type { NovaNotificacao, Notificacao } from './Notificacao';
import type { NotificacaoRepository } from './NotificacaoRepository';

const paraModelo = (row: RowDataPacket): Notificacao => ({
  id: Number(row.id),
  usuarioId: Number(row.usuario_id),
  titulo: String(row.titulo),
  mensagem: String(row.mensagem),
  lida: Boolean(row.lida),
  criadaEm: new Date(row.created_at as string | Date).toISOString(),
});

export class MySqlNotificacaoRepository implements NotificacaoRepository {
  constructor(private readonly pool: Pool) {}

  async criar(n: NovaNotificacao): Promise<void> {
    await this.pool.query('INSERT INTO notificacoes (usuario_id, titulo, mensagem) VALUES (?, ?, ?)', [
      n.usuarioId,
      n.titulo,
      n.mensagem,
    ]);
  }

  async listar(usuarioId: number, request: PageRequest): Promise<PagedResult<Notificacao>> {
    const [contagem] = await this.pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM notificacoes WHERE usuario_id = ?',
      [usuarioId],
    );
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [usuarioId, request.limit, (request.page - 1) * request.limit],
    );
    return { items: rows.map(paraModelo), total: Number(contagem[0]?.total ?? 0) };
  }

  async contarNaoLidas(usuarioId: number): Promise<number> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM notificacoes WHERE usuario_id = ? AND lida = 0',
      [usuarioId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async marcarLida(id: number, usuarioId: number): Promise<boolean> {
    // Sem "AND lida = 0": marcar de novo uma já lida continua sendo sucesso.
    const [resultado] = await this.pool.query<ResultSetHeader>(
      'UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?',
      [id, usuarioId],
    );
    return resultado.affectedRows === 1 || (await this.#existe(id, usuarioId));
  }

  async #existe(id: number, usuarioId: number): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT 1 FROM notificacoes WHERE id = ? AND usuario_id = ?', [
      id,
      usuarioId,
    ]);
    return rows.length > 0;
  }

  async marcarTodasLidas(usuarioId: number): Promise<void> {
    await this.pool.query('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0', [usuarioId]);
  }
}
