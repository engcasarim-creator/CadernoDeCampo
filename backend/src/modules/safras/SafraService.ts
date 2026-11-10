import type { ScopedRepository } from '../../shared/crud/ScopedRepository';
import { Safra, STATUS_SAFRA } from './Safra';
import type { Talhao } from '../talhoes';
import { NotFoundError } from '../../shared/errors';
import { BodyReader } from '../../shared/utils/BodyReader';
import { CrudService } from '../../shared/crud/CrudService';

export class SafraService extends CrudService<Safra> {
  protected readonly nomeRecurso = 'Safra';
  protected override readonly filtros = { talhaoId: 'talhao_id' };

  constructor(
    repository: ScopedRepository<Safra>,
    private readonly talhoes: ScopedRepository<Talhao>,
  ) {
    super(repository);
  }

  protected build(_userId: number, raw: unknown, id: number | null): Safra {
    const reader = new BodyReader(raw);
    const talhaoId = reader.integer('talhaoId');
    const cultura = reader.string('cultura', 80);
    const anoAgricola = reader.string('anoAgricola', 9);
    const dataPlantio = reader.optionalDate('dataPlantio');
    const dataColheita = reader.optionalDate('dataColheita');
    const status = reader.oneOf('status', STATUS_SAFRA);
    reader.finish();
    return new Safra({ talhaoId, cultura, anoAgricola, dataPlantio, dataColheita, status }, id);
  }

  protected override async assertParents(userId: number, safra: Safra): Promise<void> {
    const { talhaoId } = safra.toProps();
    if (!(await this.talhoes.findById(userId, talhaoId))) {
      throw new NotFoundError('Talhão não encontrado', { talhaoId: 'Talhão inexistente' });
    }
  }
}
