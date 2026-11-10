import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ConflictError } from '../../shared/errors';
import type { PagedResult, PageRequest } from '../../shared/types';
import type {
  AdministracaoDePropriedades,
  NovaTransferencia,
  PropriedadeComResponsavel,
  Transferencia,
} from './AdministracaoDePropriedades';
import { normalizarCar, normalizarCcir } from './identificadores';
import { propriedadeDeLinha } from './propriedadeDeLinha';

const SELECT_COM_RESPONSAVEL = `SELECT p.*, u.nome AS dono_nome, u.email AS dono_email, u.cpf AS dono_cpf
   FROM propriedades p JOIN usuarios u ON u.id = p.usuario_id`;

/** Escapa % _ \ para o texto digitado valer como texto, não como curinga do LIKE. */
const escaparLike = (texto: string): string => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

function paraModelo(row: RowDataPacket): PropriedadeComResponsavel {
  return {
    propriedade: propriedadeDeLinha(row),
    responsavel: {
      id: Number(row.usuario_id),
      nome: String(row.dono_nome),
      email: String(row.dono_email),
      cpf: String(row.dono_cpf),
    },
  };
}

export class MySqlAdministracaoDePropriedades implements AdministracaoDePropriedades {
  constructor(private readonly pool: Pool) {}

  async listar(request: PageRequest, busca: string | null): Promise<PagedResult<PropriedadeComResponsavel>> {
    const params: Array<string | number> = [];
    let where = '';
    if (busca !== null) {
      const texto = `%${escaparLike(busca)}%`;
      // CAR e CCIR são guardados sem pontuação: busca também pela forma normalizada (cola do recibo funciona).
      const car = `%${escaparLike(normalizarCar(busca))}%`;
      const ccir = `%${escaparLike(normalizarCcir(busca))}%`;
      where = `WHERE (p.nome LIKE ? OR p.municipio LIKE ? OR u.nome LIKE ? OR u.email LIKE ? OR p.car LIKE ? OR p.ccir LIKE ?)`;
      params.push(texto, texto, texto, texto, car, ccir);
    }
    const [contagem] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM propriedades p JOIN usuarios u ON u.id = p.usuario_id ${where}`,
      params,
    );
    const offset = (request.page - 1) * request.limit;
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `${SELECT_COM_RESPONSAVEL} ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, request.limit, offset],
    );
    return { items: rows.map(paraModelo), total: Number(contagem[0]?.total ?? 0) };
  }

  async buscarPorId(id: number): Promise<PropriedadeComResponsavel | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(`${SELECT_COM_RESPONSAVEL} WHERE p.id = ?`, [id]);
    return rows[0] ? paraModelo(rows[0]) : null;
  }

  async listarTransferencias(propriedadeId: number): Promise<Transferencia[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT t.id, t.propriedade_id, t.motivo, t.created_at,
              de.id AS de_id, de.nome AS de_nome, de.email AS de_email,
              pa.id AS para_id, pa.nome AS para_nome, pa.email AS para_email,
              ad.id AS admin_id, ad.nome AS admin_nome
         FROM transferencias_propriedade t
         JOIN usuarios de ON de.id = t.de_usuario_id
         JOIN usuarios pa ON pa.id = t.para_usuario_id
         JOIN usuarios ad ON ad.id = t.realizada_por
        WHERE t.propriedade_id = ?
        ORDER BY t.id DESC`,
      [propriedadeId],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      propriedadeId: Number(row.propriedade_id),
      de: { id: Number(row.de_id), nome: String(row.de_nome), email: String(row.de_email) },
      para: { id: Number(row.para_id), nome: String(row.para_nome), email: String(row.para_email) },
      realizadaPor: { id: Number(row.admin_id), nome: String(row.admin_nome) },
      motivo: String(row.motivo),
      realizadaEm: new Date(row.created_at as string | Date).toISOString(),
    }));
  }

  async transferir(t: NovaTransferencia): Promise<void> {
    const conexao = await this.pool.getConnection();
    try {
      await conexao.beginTransaction();
      // Só troca se o responsável ainda for o esperado: evita duas trocas simultâneas se atropelarem.
      const [troca] = await conexao.query<ResultSetHeader>(
        'UPDATE propriedades SET usuario_id = ? WHERE id = ? AND usuario_id = ?',
        [t.paraUsuarioId, t.propriedadeId, t.deUsuarioId],
      );
      if (troca.affectedRows !== 1) {
        throw new ConflictError('O responsável por esta propriedade mudou. Atualize a tela e tente de novo.');
      }
      await conexao.query(
        `INSERT INTO transferencias_propriedade
           (propriedade_id, propriedade_nome, propriedade_car, de_usuario_id, para_usuario_id, realizada_por, motivo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.propriedadeId, t.propriedadeNome, t.propriedadeCar, t.deUsuarioId, t.paraUsuarioId, t.adminId, t.motivo],
      );
      await conexao.commit();
    } catch (error) {
      await conexao.rollback();
      throw error;
    } finally {
      conexao.release();
    }
  }
}
