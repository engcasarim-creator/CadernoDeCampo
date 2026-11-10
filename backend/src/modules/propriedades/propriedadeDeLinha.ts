import type { RowDataPacket } from 'mysql2/promise';
import { Propriedade } from './Propriedade';

/** Converte uma linha da tabela `propriedades` (alias `p` ou sem alias) em entidade. */
export function propriedadeDeLinha(row: RowDataPacket): Propriedade {
  return new Propriedade(
    {
      usuarioId: Number(row.usuario_id),
      nome: String(row.nome),
      municipio: String(row.municipio),
      uf: String(row.uf),
      areaHa: Number(row.area_ha),
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      car: row.car === null ? null : String(row.car),
      ccir: row.ccir === null ? null : String(row.ccir),
    },
    Number(row.id),
  );
}
