import type { RowDataPacket } from 'mysql2/promise';
import { Propriedade, type PropriedadeProps } from '../entities/Propriedade';
import { BaseRepository } from './BaseRepository';

export class PropriedadeRepository extends BaseRepository<Propriedade, PropriedadeProps> {
  protected readonly table = 'propriedades';
  protected readonly alias = 'p';
  protected readonly joins = '';
  protected readonly ownerColumn = 'p.usuario_id';

  protected fromRow(row: RowDataPacket): Propriedade {
    return new Propriedade(
      {
        usuarioId: Number(row.usuario_id),
        nome: String(row.nome),
        municipio: String(row.municipio),
        uf: String(row.uf),
        areaHa: Number(row.area_ha),
      },
      Number(row.id),
    );
  }

  protected toColumns(props: PropriedadeProps): Record<string, unknown> {
    return {
      usuario_id: props.usuarioId,
      nome: props.nome,
      municipio: props.municipio,
      uf: props.uf,
      area_ha: props.areaHa,
    };
  }
}
