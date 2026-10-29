import type { RowDataPacket } from 'mysql2/promise';
import type { AreaPorPropriedade } from '../contracts/repositories';
import { Talhao, type TalhaoProps } from '../entities/Talhao';
import { BaseRepository } from './BaseRepository';

export class TalhaoRepository extends BaseRepository<Talhao, TalhaoProps> implements AreaPorPropriedade {
  protected readonly table = 'talhoes';
  protected readonly alias = 't';
  protected readonly joins = 'JOIN propriedades p ON p.id = t.propriedade_id';
  protected readonly ownerColumn = 'p.usuario_id';

  async somaAreas(propriedadeId: number, ignorarTalhaoId: number | null): Promise<number> {
    // Os ids começam em 1, então "<> 0" equivale a "não ignorar ninguém".
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT COALESCE(SUM(area_ha), 0) AS total FROM talhoes WHERE propriedade_id = ? AND id <> ?',
      [propriedadeId, ignorarTalhaoId ?? 0],
    );
    return Number(rows[0]?.total ?? 0);
  }

  protected fromRow(row: RowDataPacket): Talhao {
    return new Talhao(
      {
        propriedadeId: Number(row.propriedade_id),
        nome: String(row.nome),
        areaHa: Number(row.area_ha),
        tipoSolo: row.tipo_solo === null ? null : String(row.tipo_solo),
      },
      Number(row.id),
    );
  }

  protected toColumns(props: TalhaoProps): Record<string, unknown> {
    return {
      propriedade_id: props.propriedadeId,
      nome: props.nome,
      area_ha: props.areaHa,
      tipo_solo: props.tipoSolo,
    };
  }
}
