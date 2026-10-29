import type { ScopedRepository } from '../contracts/repositories';
import { TIPOS_ATIVIDADE, type Atividade } from '../entities/atividades/Atividade';
import { AtividadeFactory } from '../entities/atividades/AtividadeFactory';
import type { Safra } from '../entities/Safra';
import { NotFoundError } from '../errors';
import { BodyReader } from '../utils/BodyReader';
import { CrudService } from './CrudService';

export class AtividadeService extends CrudService<Atividade> {
  protected readonly nomeRecurso = 'Atividade';
  protected override readonly filtros = { safraId: 'safra_id' };

  constructor(
    repository: ScopedRepository<Atividade>,
    private readonly safras: ScopedRepository<Safra>,
  ) {
    super(repository);
  }

  protected build(_userId: number, raw: unknown, id: number | null): Atividade {
    const reader = new BodyReader(raw);
    const safraId = reader.integer('safraId');
    const tipo = reader.oneOf('tipo', TIPOS_ATIVIDADE);
    const data = reader.date('data');
    const descricao = reader.string('descricao', 255);
    const detalhes = reader.raw('detalhes');
    reader.finish();
    // A fábrica escolhe a subclasse (Plantio/Aplicacao/Colheita) e valida os detalhes do tipo.
    return AtividadeFactory.criar(tipo, { safraId, data, descricao }, detalhes, id);
  }

  protected override async assertParents(userId: number, atividade: Atividade): Promise<void> {
    const { safraId } = atividade.toProps();
    if (!(await this.safras.findById(userId, safraId))) {
      throw new NotFoundError('Safra não encontrada', { safraId: 'Safra inexistente' });
    }
  }
}
