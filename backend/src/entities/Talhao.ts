import { ValidationError } from '../errors';
import { Entity } from './Entity';

export interface TalhaoProps {
  propriedadeId: number;
  nome: string;
  areaHa: number;
  tipoSolo: string | null;
}

export class Talhao extends Entity<TalhaoProps> {
  readonly #propriedadeId: number;
  readonly #nome: string;
  readonly #areaHa: number;
  readonly #tipoSolo: string | null;

  constructor(props: TalhaoProps, id: number | null = null) {
    super(id);
    if (props.nome.trim() === '') throw new ValidationError('Nome é obrigatório', { nome: 'Campo obrigatório' });
    if (!(props.areaHa > 0)) {
      throw new ValidationError('Área inválida', { areaHa: 'Deve ser maior que 0' });
    }
    this.#propriedadeId = props.propriedadeId;
    this.#nome = props.nome;
    this.#areaHa = props.areaHa;
    this.#tipoSolo = props.tipoSolo;
  }

  toProps(): TalhaoProps {
    return {
      propriedadeId: this.#propriedadeId,
      nome: this.#nome,
      areaHa: this.#areaHa,
      tipoSolo: this.#tipoSolo,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      propriedadeId: this.#propriedadeId,
      nome: this.#nome,
      areaHa: this.#areaHa,
      tipoSolo: this.#tipoSolo,
    };
  }
}
