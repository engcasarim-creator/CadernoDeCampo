import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { PagedResult, PageRequest } from '../../shared/types';
import {
  Contestacao,
  type ArquivoDeContestacao,
  type DecisaoDeContestacao,
  type StatusDeContestacao,
  type StatusDoEmail,
} from './Contestacao';
import type { ContestacaoRepository, NovaContestacao, NovoArquivo } from './ContestacaoRepository';

const iso = (valor: unknown): string => new Date(valor as string | Date).toISOString();

function arquivoDeLinha(row: RowDataPacket): ArquivoDeContestacao {
  return {
    id: Number(row.id),
    nomeOriginal: String(row.nome_original),
    chave: String(row.chave),
    tamanho: Number(row.tamanho),
    enviadoEm: iso(row.created_at),
  };
}

function contestacaoDeLinha(row: RowDataPacket, arquivos: ArquivoDeContestacao[]): Contestacao {
  return new Contestacao(
    {
      solicitanteId: Number(row.solicitante_id),
      propriedadeId: row.propriedade_id === null ? null : Number(row.propriedade_id),
      car: String(row.car),
      ccir: row.ccir === null ? null : String(row.ccir),
      justificativa: String(row.justificativa),
      status: row.status as StatusDeContestacao,
      decisao: row.decisao === null ? null : String(row.decisao),
      decididaPor: row.decidida_por === null ? null : Number(row.decidida_por),
      decididaEm: row.decidida_em === null ? null : iso(row.decidida_em),
      emailStatus: row.email_status === null ? null : (row.email_status as StatusDoEmail),
      criadaEm: iso(row.created_at),
      arquivos,
    },
    Number(row.id),
  );
}

export class MySqlContestacaoRepository implements ContestacaoRepository {
  constructor(private readonly pool: Pool) {}

  async criar(nova: NovaContestacao, arquivos: NovoArquivo[]): Promise<Contestacao> {
    const conexao = await this.pool.getConnection();
    try {
      await conexao.beginTransaction();
      const [resultado] = await conexao.query<ResultSetHeader>(
        `INSERT INTO contestacoes (solicitante_id, propriedade_id, car, ccir, justificativa)
         VALUES (?, ?, ?, ?, ?)`,
        [nova.solicitanteId, nova.propriedadeId, nova.car, nova.ccir, nova.justificativa],
      );
      for (const arquivo of arquivos) {
        await conexao.query(
          'INSERT INTO contestacao_arquivos (contestacao_id, nome_original, chave, tamanho) VALUES (?, ?, ?, ?)',
          [resultado.insertId, arquivo.nomeOriginal, arquivo.chave, arquivo.tamanho],
        );
      }
      await conexao.commit();
      const criada = await this.buscarPorId(resultado.insertId);
      if (!criada) throw new Error('Contestação não encontrada após a criação');
      return criada;
    } catch (error) {
      await conexao.rollback();
      throw error;
    } finally {
      conexao.release();
    }
  }

  async #comArquivos(rows: RowDataPacket[]): Promise<Contestacao[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => Number(row.id));
    const [arquivos] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM contestacao_arquivos WHERE contestacao_id IN (?) ORDER BY id',
      [ids],
    );
    return rows.map((row) =>
      contestacaoDeLinha(
        row,
        arquivos.filter((a) => Number(a.contestacao_id) === Number(row.id)).map(arquivoDeLinha),
      ),
    );
  }

  async buscarPorId(id: number): Promise<Contestacao | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT * FROM contestacoes WHERE id = ?', [id]);
    return (await this.#comArquivos(rows))[0] ?? null;
  }

  async buscarEmAnalise(solicitanteId: number, propriedadeId: number): Promise<Contestacao | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT * FROM contestacoes WHERE solicitante_id = ? AND propriedade_id = ? AND status = 'EM_ANALISE' LIMIT 1",
      [solicitanteId, propriedadeId],
    );
    return (await this.#comArquivos(rows))[0] ?? null;
  }

  async #pagina(where: string, params: unknown[], ordem: string, request: PageRequest): Promise<PagedResult<Contestacao>> {
    const [contagem] = await this.pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM contestacoes ${where}`, params);
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM contestacoes ${where} ORDER BY ${ordem} LIMIT ? OFFSET ?`,
      [...params, request.limit, (request.page - 1) * request.limit],
    );
    return { items: await this.#comArquivos(rows), total: Number(contagem[0]?.total ?? 0) };
  }

  listarDoSolicitante(solicitanteId: number, request: PageRequest): Promise<PagedResult<Contestacao>> {
    return this.#pagina('WHERE solicitante_id = ?', [solicitanteId], 'id DESC', request);
  }

  listarTodas(request: PageRequest, status: StatusDeContestacao | null): Promise<PagedResult<Contestacao>> {
    const ordem = status === 'EM_ANALISE' ? 'id ASC' : 'id DESC';
    return status === null
      ? this.#pagina('', [], ordem, request)
      : this.#pagina('WHERE status = ?', [status], ordem, request);
  }

  async decidir(id: number, adminId: number, decisao: DecisaoDeContestacao, motivo: string): Promise<boolean> {
    const [resultado] = await this.pool.query<ResultSetHeader>(
      `UPDATE contestacoes
          SET status = ?, decisao = ?, decidida_por = ?, decidida_em = CURRENT_TIMESTAMP, email_status = 'PENDENTE'
        WHERE id = ? AND status = 'EM_ANALISE'`,
      [decisao, motivo, adminId, id],
    );
    return resultado.affectedRows === 1;
  }

  async reabrir(id: number): Promise<void> {
    await this.pool.query(
      `UPDATE contestacoes
          SET status = 'EM_ANALISE', decisao = NULL, decidida_por = NULL, decidida_em = NULL, email_status = NULL
        WHERE id = ?`,
      [id],
    );
  }

  async registrarEmail(id: number, status: StatusDoEmail): Promise<void> {
    await this.pool.query('UPDATE contestacoes SET email_status = ? WHERE id = ?', [status, id]);
  }
}
