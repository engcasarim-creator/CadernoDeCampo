import { BodyReader } from '../../utils/BodyReader';
import { arredondar, Atividade, type AtividadeBase, type Detalhes, type TipoAtividade } from './Atividade';
import type { ResumoComparativo } from './ResumoComparativo';

export interface PlantioDetalhes {
  sementeKg: number;
  precoPorKg: number;
  variedade: string | null;
}

export class Plantio extends Atividade {
  readonly #sementeKg: number;
  readonly #precoPorKg: number;
  readonly #variedade: string | null;

  constructor(base: AtividadeBase, detalhes: PlantioDetalhes, id: number | null = null) {
    super(base, id);
    this.#sementeKg = detalhes.sementeKg;
    this.#precoPorKg = detalhes.precoPorKg;
    this.#variedade = detalhes.variedade;
  }

  static lerDetalhes(raw: unknown): PlantioDetalhes {
    const reader = new BodyReader(raw, 'detalhes.');
    const detalhes: PlantioDetalhes = {
      sementeKg: reader.number('sementeKg', { min: 0, exclusive: true }),
      precoPorKg: reader.number('precoPorKg', { min: 0 }),
      variedade: reader.optionalString('variedade', 80),
    };
    reader.finish();
    return detalhes;
  }

  get tipo(): TipoAtividade {
    return 'PLANTIO';
  }

  calcularCusto(): number {
    return arredondar(this.#sementeKg * this.#precoPorKg);
  }

  override contribuirPara(resumo: ResumoComparativo): void {
    resumo.registrarPlantio(this.#sementeKg, this.calcularCusto());
  }

  protected detalhes(): Detalhes {
    return { sementeKg: this.#sementeKg, precoPorKg: this.#precoPorKg, variedade: this.#variedade };
  }
}
