import { BodyReader } from '../../utils/BodyReader';
import { arredondar, Atividade, type AtividadeBase, type Detalhes, type TipoAtividade } from './Atividade';
import type { ResumoComparativo } from './ResumoComparativo';

export interface ColheitaDetalhes {
  sacas: number;
  /** Custo de colheita/transporte por saca (R$). */
  custoPorSaca: number;
}

export class Colheita extends Atividade {
  readonly #sacas: number;
  readonly #custoPorSaca: number;

  constructor(base: AtividadeBase, detalhes: ColheitaDetalhes, id: number | null = null) {
    super(base, id);
    this.#sacas = detalhes.sacas;
    this.#custoPorSaca = detalhes.custoPorSaca;
  }

  static lerDetalhes(raw: unknown): ColheitaDetalhes {
    const reader = new BodyReader(raw, 'detalhes.');
    const detalhes: ColheitaDetalhes = {
      sacas: reader.number('sacas', { min: 0, exclusive: true }),
      custoPorSaca: reader.number('custoPorSaca', { min: 0 }),
    };
    reader.finish();
    return detalhes;
  }

  get tipo(): TipoAtividade {
    return 'COLHEITA';
  }

  calcularCusto(): number {
    return arredondar(this.#sacas * this.#custoPorSaca);
  }

  override contribuirPara(resumo: ResumoComparativo): void {
    resumo.registrarColheita(this.#sacas, this.calcularCusto());
  }

  protected detalhes(): Detalhes {
    return { sacas: this.#sacas, custoPorSaca: this.#custoPorSaca };
  }
}
