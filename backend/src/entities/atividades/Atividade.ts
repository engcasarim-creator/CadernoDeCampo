import { ValidationError } from '../../errors';
import { Entity } from '../Entity';
import type { ResumoComparativo } from './ResumoComparativo';

export const TIPOS_ATIVIDADE = ['PLANTIO', 'APLICACAO', 'COLHEITA'] as const;
export type TipoAtividade = (typeof TIPOS_ATIVIDADE)[number];

export type Detalhes = Record<string, unknown>;

/** Dados comuns a qualquer atividade de campo. */
export interface AtividadeBase {
  safraId: number;
  data: string;
  descricao: string;
}

/** Retrato de persistência: campos comuns + `detalhes` (JSON específico de cada tipo). */
export interface AtividadeProps extends AtividadeBase {
  tipo: TipoAtividade;
  detalhes: Detalhes;
}

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Classe abstrata: concentra o que é comum (safra, data, descrição, serialização)
 * e obriga cada tipo concreto a implementar `tipo`, `detalhes()` e `calcularCusto()`.
 * Qualquer subclasse pode ser usada no lugar de `Atividade` (Liskov).
 */
export abstract class Atividade extends Entity<AtividadeProps> {
  readonly #safraId: number;
  readonly #data: string;
  readonly #descricao: string;

  protected constructor(base: AtividadeBase, id: number | null) {
    super(id);
    if (base.descricao.trim() === '') {
      throw new ValidationError('Descrição é obrigatória', { descricao: 'Campo obrigatório' });
    }
    this.#safraId = base.safraId;
    this.#data = base.data;
    this.#descricao = base.descricao;
  }

  abstract get tipo(): TipoAtividade;

  /** Custo total da atividade (cada tipo calcula do seu jeito: polimorfismo). */
  abstract calcularCusto(): number;

  protected abstract detalhes(): Detalhes;

  /** Como esta atividade entra no comparativo plantio × colheita. Por padrão, não participa. */
  contribuirPara(_resumo: ResumoComparativo): void {
    // só Plantio e Colheita sobrescrevem
  }

  toProps(): AtividadeProps {
    return {
      safraId: this.#safraId,
      tipo: this.tipo,
      data: this.#data,
      descricao: this.#descricao,
      detalhes: this.detalhes(),
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      safraId: this.#safraId,
      tipo: this.tipo,
      data: this.#data,
      descricao: this.#descricao,
      detalhes: this.detalhes(),
      custoTotal: this.calcularCusto(),
    };
  }
}
