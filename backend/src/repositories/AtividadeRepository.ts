import type { RowDataPacket } from 'mysql2/promise';
import { TIPOS_ATIVIDADE, type Atividade, type AtividadeProps, type TipoAtividade } from '../entities/atividades/Atividade';
import { AtividadeFactory } from '../entities/atividades/AtividadeFactory';
import { BaseRepository } from './BaseRepository';

function lerTipo(valor: unknown): TipoAtividade {
  const tipo = TIPOS_ATIVIDADE.find((item) => item === valor);
  if (tipo === undefined) throw new Error(`Tipo de atividade desconhecido no banco: ${String(valor)}`);
  return tipo;
}

/** O driver devolve JSON já convertido em objeto; por segurança também aceitamos texto. */
function lerDetalhes(valor: unknown): unknown {
  return typeof valor === 'string' ? (JSON.parse(valor) as unknown) : valor;
}

export class AtividadeRepository extends BaseRepository<Atividade, AtividadeProps> {
  protected readonly table = 'atividades';
  protected readonly alias = 'a';
  protected readonly joins =
    'JOIN safras s ON s.id = a.safra_id JOIN talhoes t ON t.id = s.talhao_id JOIN propriedades p ON p.id = t.propriedade_id';
  protected readonly ownerColumn = 'p.usuario_id';

  protected fromRow(row: RowDataPacket): Atividade {
    // A fábrica devolve a subclasse certa (Plantio, Aplicacao, Colheita) conforme o tipo gravado.
    return AtividadeFactory.criar(
      lerTipo(row.tipo),
      { safraId: Number(row.safra_id), data: String(row.data), descricao: String(row.descricao) },
      lerDetalhes(row.detalhes),
      Number(row.id),
    );
  }

  protected toColumns(props: AtividadeProps): Record<string, unknown> {
    return {
      safra_id: props.safraId,
      tipo: props.tipo,
      data: props.data,
      descricao: props.descricao,
      detalhes: JSON.stringify(props.detalhes),
    };
  }
}
