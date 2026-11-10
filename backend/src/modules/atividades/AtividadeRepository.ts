import type { RowDataPacket } from 'mysql2/promise';
import { TIPOS_ATIVIDADE, type Atividade, type AtividadeProps, type TipoAtividade } from './Atividade';
import { AtividadeFactory } from './AtividadeFactory';
import { TipoPersonalizado } from '../tipos-atividade';
import type { UsoDeTipo } from '../tipos-atividade';
import { BaseRepository } from '../../shared/crud/BaseRepository';

function lerTipo(valor: unknown): TipoAtividade {
  const tipo = TIPOS_ATIVIDADE.find((item) => item === valor);
  if (tipo === undefined) throw new Error(`Tipo de atividade desconhecido no banco: ${String(valor)}`);
  return tipo;
}

/** O driver devolve JSON já convertido em objeto; por segurança também aceitamos texto. */
function lerDetalhes(valor: unknown): unknown {
  return typeof valor === 'string' ? (JSON.parse(valor) as unknown) : valor;
}

export class AtividadeRepository extends BaseRepository<Atividade, AtividadeProps> implements UsoDeTipo {
  protected readonly table = 'atividades';
  protected readonly alias = 'a';
  protected readonly joins =
    'JOIN safras s ON s.id = a.safra_id JOIN talhoes t ON t.id = s.talhao_id JOIN propriedades p ON p.id = t.propriedade_id ' +
    'LEFT JOIN tipos_atividade ti ON ti.id = a.tipo_id';
  protected readonly ownerColumn = 'p.usuario_id';
  // Traz a definição do tipo personalizado junto com a atividade (uma consulta só).
  protected override readonly extraColumns = ', ti.nome AS tipo_nome, ti.campos AS tipo_campos';

  async existeAtividadeComTipo(tipoId: number): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>('SELECT 1 FROM atividades WHERE tipo_id = ? LIMIT 1', [tipoId]);
    return rows.length > 0;
  }

  protected fromRow(row: RowDataPacket): Atividade {
    // A fábrica devolve a subclasse certa (Plantio, Aplicacao, Colheita ou Personalizada) conforme o tipo gravado.
    const definicao =
      row.tipo_id === null || row.tipo_id === undefined
        ? null
        : TipoPersonalizado.restaurar(Number(row.tipo_id), String(row.tipo_nome), row.tipo_campos);
    return AtividadeFactory.criar(
      lerTipo(row.tipo),
      { safraId: Number(row.safra_id), data: String(row.data), descricao: String(row.descricao) },
      lerDetalhes(row.detalhes),
      Number(row.id),
      definicao,
    );
  }

  protected toColumns(props: AtividadeProps): Record<string, unknown> {
    return {
      safra_id: props.safraId,
      tipo: props.tipo,
      tipo_id: props.tipoId,
      data: props.data,
      descricao: props.descricao,
      detalhes: JSON.stringify(props.detalhes),
    };
  }
}
