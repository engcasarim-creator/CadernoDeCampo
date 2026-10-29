import { ValidationError } from '../errors';
import { Entity } from './Entity';

export interface PropriedadeProps {
  usuarioId: number;
  nome: string;
  municipio: string;
  uf: string;
  areaHa: number;
}

export class Propriedade extends Entity<PropriedadeProps> {
  readonly #usuarioId: number;
  readonly #nome: string;
  readonly #municipio: string;
  readonly #uf: string;
  readonly #areaHa: number;

  constructor(props: PropriedadeProps, id: number | null = null) {
    super(id);
    if (props.nome.trim() === '') throw new ValidationError('Nome é obrigatório', { nome: 'Campo obrigatório' });
    if (props.municipio.trim() === '') {
      throw new ValidationError('Município é obrigatório', { municipio: 'Campo obrigatório' });
    }
    if (!/^[A-Z]{2}$/.test(props.uf)) {
      throw new ValidationError('UF inválida', { uf: 'Use 2 letras maiúsculas (ex.: PR)' });
    }
    if (!(props.areaHa > 0)) {
      throw new ValidationError('Área inválida', { areaHa: 'Deve ser maior que 0' });
    }
    this.#usuarioId = props.usuarioId;
    this.#nome = props.nome;
    this.#municipio = props.municipio;
    this.#uf = props.uf;
    this.#areaHa = props.areaHa;
  }

  toProps(): PropriedadeProps {
    return {
      usuarioId: this.#usuarioId,
      nome: this.#nome,
      municipio: this.#municipio,
      uf: this.#uf,
      areaHa: this.#areaHa,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nome: this.#nome,
      municipio: this.#municipio,
      uf: this.#uf,
      areaHa: this.#areaHa,
    };
  }
}
