import { round2 } from '../../utils/numbers';

/** Peso de uma saca, usado para comparar semente (kg) com colheita (sacas) na mesma unidade. */
export const KG_POR_SACA = 60;

/**
 * Acumulador do comparativo plantio × colheita de uma safra.
 * Cada atividade se registra no resumo (ver `Atividade.contribuirPara`), então este
 * código não precisa conhecer os tipos concretos: novos tipos entram sem alterá-lo.
 */
export class ResumoComparativo {
  #atividadesPlantio = 0;
  #sementeKg = 0;
  #custoPlantio = 0;
  #atividadesColheita = 0;
  #sacas = 0;
  #custoColheita = 0;

  constructor(
    private readonly safraId: number,
    private readonly cultura: string,
    private readonly anoAgricola: string,
  ) {}

  registrarPlantio(sementeKg: number, custo: number): void {
    this.#atividadesPlantio += 1;
    this.#sementeKg += sementeKg;
    this.#custoPlantio += custo;
  }

  registrarColheita(sacas: number, custo: number): void {
    this.#atividadesColheita += 1;
    this.#sacas += sacas;
    this.#custoColheita += custo;
  }

  toJSON(): Record<string, unknown> {
    const plantadoKg = round2(this.#sementeKg);
    const colhidoKg = round2(this.#sacas * KG_POR_SACA);
    const custoPlantio = round2(this.#custoPlantio);
    const custoColheita = round2(this.#custoColheita);

    return {
      safraId: this.safraId,
      cultura: this.cultura,
      anoAgricola: this.anoAgricola,
      kgPorSaca: KG_POR_SACA,
      plantio: { atividades: this.#atividadesPlantio, sementeKg: plantadoKg, custo: custoPlantio },
      colheita: {
        atividades: this.#atividadesColheita,
        sacas: round2(this.#sacas),
        kg: colhidoKg,
        custo: custoColheita,
      },
      diferenca: {
        quantidadeKg: round2(colhidoKg - plantadoKg),
        custo: round2(custoColheita - custoPlantio),
      },
      /** Quantos kg foram colhidos para cada kg de semente plantado (null se não há plantio). */
      relacaoColhidoPlantado: plantadoKg > 0 ? round2(colhidoKg / plantadoKg) : null,
    };
  }
}
