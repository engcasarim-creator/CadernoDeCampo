import { BodyReader } from '../../utils/BodyReader';
import { arredondar, Atividade, type AtividadeBase, type Detalhes, type TipoAtividade } from './Atividade';

export interface AplicacaoDetalhes {
  produto: string;
  /** Dose por hectare (L/ha ou kg/ha). */
  doseHa: number;
  areaHa: number;
  /** Preço por litro ou quilo do produto. */
  precoPorUnidade: number;
}

export class Aplicacao extends Atividade {
  readonly #produto: string;
  readonly #doseHa: number;
  readonly #areaHa: number;
  readonly #precoPorUnidade: number;

  constructor(base: AtividadeBase, detalhes: AplicacaoDetalhes, id: number | null = null) {
    super(base, id);
    this.#produto = detalhes.produto;
    this.#doseHa = detalhes.doseHa;
    this.#areaHa = detalhes.areaHa;
    this.#precoPorUnidade = detalhes.precoPorUnidade;
  }

  static lerDetalhes(raw: unknown): AplicacaoDetalhes {
    const reader = new BodyReader(raw, 'detalhes.');
    const detalhes: AplicacaoDetalhes = {
      produto: reader.string('produto', 120),
      doseHa: reader.number('doseHa', { min: 0, exclusive: true }),
      areaHa: reader.number('areaHa', { min: 0, exclusive: true }),
      precoPorUnidade: reader.number('precoPorUnidade', { min: 0 }),
    };
    reader.finish();
    return detalhes;
  }

  get tipo(): TipoAtividade {
    return 'APLICACAO';
  }

  calcularCusto(): number {
    return arredondar(this.#doseHa * this.#areaHa * this.#precoPorUnidade);
  }

  protected detalhes(): Detalhes {
    return {
      produto: this.#produto,
      doseHa: this.#doseHa,
      areaHa: this.#areaHa,
      precoPorUnidade: this.#precoPorUnidade,
    };
  }
}
