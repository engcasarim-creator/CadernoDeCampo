import type { AreaPorPropriedade, ScopedRepository } from '../contracts/repositories';
import type { Propriedade } from '../entities/Propriedade';
import { Talhao } from '../entities/Talhao';
import { NotFoundError, ValidationError } from '../errors';
import { BodyReader } from '../utils/BodyReader';
import { formatNumber, round2 } from '../utils/numbers';
import { CrudService } from './CrudService';

export class TalhaoService extends CrudService<Talhao> {
  protected readonly nomeRecurso = 'Talhão';
  protected override readonly filtros = { propriedadeId: 'propriedade_id' };
  private readonly areas: AreaPorPropriedade;

  constructor(
    repository: ScopedRepository<Talhao> & AreaPorPropriedade,
    private readonly propriedades: ScopedRepository<Propriedade>,
  ) {
    super(repository);
    this.areas = repository;
  }

  protected build(_userId: number, raw: unknown, id: number | null): Talhao {
    const reader = new BodyReader(raw);
    const propriedadeId = reader.integer('propriedadeId');
    const nome = reader.string('nome', 120);
    const areaHa = reader.number('areaHa', { min: 0, exclusive: true });
    const tipoSolo = reader.optionalString('tipoSolo', 60);
    reader.finish();
    return new Talhao({ propriedadeId, nome, areaHa, tipoSolo }, id);
  }

  protected override async assertParents(userId: number, talhao: Talhao): Promise<void> {
    const { propriedadeId } = talhao.toProps();
    if (!(await this.propriedades.findById(userId, propriedadeId))) {
      throw new NotFoundError('Propriedade não encontrada', { propriedadeId: 'Propriedade inexistente' });
    }
  }

  /** A soma das áreas dos talhões não pode ultrapassar a área da propriedade. */
  protected override async assertBusinessRules(userId: number, talhao: Talhao): Promise<void> {
    const { propriedadeId, areaHa } = talhao.toProps();
    const propriedade = await this.propriedades.findById(userId, propriedadeId);
    if (!propriedade) return; // já tratado em assertParents

    const { nome, areaHa: areaTotal } = propriedade.toProps();
    const usada = round2(await this.areas.somaAreas(propriedadeId, talhao.id));
    const disponivel = Math.max(0, round2(areaTotal - usada));

    if (round2(areaHa) > disponivel) {
      throw new ValidationError('A área do talhão ultrapassa a área disponível da propriedade', {
        areaHa:
          `Você informou ${formatNumber(areaHa)} ha, mas a propriedade "${nome}" tem apenas ` +
          `${formatNumber(disponivel)} ha disponíveis (área total de ${formatNumber(areaTotal)} ha, ` +
          `${formatNumber(usada)} ha já usados por outros talhões).`,
      });
    }
  }
}
