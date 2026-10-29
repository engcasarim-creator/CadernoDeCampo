import type { AreaPorPropriedade, ScopedRepository } from '../contracts/repositories';
import { Propriedade } from '../entities/Propriedade';
import { ValidationError } from '../errors';
import { BodyReader } from '../utils/BodyReader';
import { formatNumber, round2 } from '../utils/numbers';
import { CrudService } from './CrudService';

export class PropriedadeService extends CrudService<Propriedade> {
  protected readonly nomeRecurso = 'Propriedade';

  constructor(
    repository: ScopedRepository<Propriedade>,
    private readonly areas: AreaPorPropriedade,
  ) {
    super(repository);
  }

  protected build(userId: number, raw: unknown, id: number | null): Propriedade {
    const reader = new BodyReader(raw);
    const nome = reader.string('nome', 120);
    const municipio = reader.string('municipio', 120);
    const uf = reader.string('uf', 2).toUpperCase();
    const areaHa = reader.number('areaHa', { min: 0, exclusive: true });
    reader.finish();
    return new Propriedade({ usuarioId: userId, nome, municipio, uf, areaHa }, id);
  }

  /** Ao editar, a nova área não pode ficar menor do que a soma dos talhões já cadastrados. */
  protected override async assertBusinessRules(_userId: number, propriedade: Propriedade): Promise<void> {
    if (propriedade.id === null) return; // propriedade nova ainda não tem talhões
    const usada = round2(await this.areas.somaAreas(propriedade.id, null));
    const { areaHa } = propriedade.toProps();

    if (round2(areaHa) < usada) {
      throw new ValidationError('A área da propriedade é menor que a soma dos seus talhões', {
        areaHa:
          `Os talhões desta propriedade já somam ${formatNumber(usada)} ha. ` +
          `A área da propriedade não pode ser menor que isso (você informou ${formatNumber(areaHa)} ha).`,
      });
    }
  }
}
