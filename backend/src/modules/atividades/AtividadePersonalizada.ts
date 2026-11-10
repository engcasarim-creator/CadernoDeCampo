import type { TipoPersonalizado, ValoresAtividade } from '../tipos-atividade';
import { arredondar, Atividade, type AtividadeBase, type Detalhes, type TipoAtividade } from './Atividade';

/**
 * Atividade de um tipo criado pelo administrador (ex.: Tratorista).
 * Os campos e a fórmula de custo vêm da definição do tipo; o resto do sistema a trata
 * como qualquer outra Atividade (polimorfismo / Liskov).
 */
export class AtividadePersonalizada extends Atividade {
  readonly #definicao: TipoPersonalizado;
  readonly #valores: ValoresAtividade;

  constructor(base: AtividadeBase, definicao: TipoPersonalizado, detalhes: unknown, id: number | null = null) {
    super(base, id);
    this.#definicao = definicao;
    this.#valores = definicao.lerValores(detalhes);
  }

  get tipo(): TipoAtividade {
    return 'PERSONALIZADA';
  }

  override get tipoId(): number | null {
    return this.#definicao.id;
  }

  calcularCusto(): number {
    return arredondar(this.#definicao.calcularCusto(this.#valores));
  }

  protected detalhes(): Detalhes {
    return { ...this.#valores };
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), tipoId: this.tipoId, tipoNome: this.#definicao.nome };
  }
}
