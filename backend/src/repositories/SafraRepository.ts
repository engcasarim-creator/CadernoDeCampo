import type { RowDataPacket } from 'mysql2/promise';
import { Safra, STATUS_SAFRA, type SafraProps, type StatusSafra } from '../entities/Safra';
import { BaseRepository } from './BaseRepository';

function lerStatus(valor: unknown): StatusSafra {
  const status = STATUS_SAFRA.find((item) => item === valor);
  if (status === undefined) throw new Error(`Status de safra desconhecido no banco: ${String(valor)}`);
  return status;
}

export class SafraRepository extends BaseRepository<Safra, SafraProps> {
  protected readonly table = 'safras';
  protected readonly alias = 's';
  protected readonly joins =
    'JOIN talhoes t ON t.id = s.talhao_id JOIN propriedades p ON p.id = t.propriedade_id';
  protected readonly ownerColumn = 'p.usuario_id';

  protected fromRow(row: RowDataPacket): Safra {
    return new Safra(
      {
        talhaoId: Number(row.talhao_id),
        cultura: String(row.cultura),
        anoAgricola: String(row.ano_agricola),
        dataPlantio: row.data_plantio === null ? null : String(row.data_plantio),
        dataColheita: row.data_colheita === null ? null : String(row.data_colheita),
        status: lerStatus(row.status),
      },
      Number(row.id),
    );
  }

  protected toColumns(props: SafraProps): Record<string, unknown> {
    return {
      talhao_id: props.talhaoId,
      cultura: props.cultura,
      ano_agricola: props.anoAgricola,
      data_plantio: props.dataPlantio,
      data_colheita: props.dataColheita,
      status: props.status,
    };
  }
}
