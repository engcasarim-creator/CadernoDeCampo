import { ValidationError } from '../errors';
import { Entity } from './Entity';

export const STATUS_SAFRA = ['PLANEJADA', 'EM_ANDAMENTO', 'ENCERRADA'] as const;
export type StatusSafra = (typeof STATUS_SAFRA)[number];

export interface SafraProps {
  talhaoId: number;
  cultura: string;
  anoAgricola: string;
  dataPlantio: string | null;
  dataColheita: string | null;
  status: StatusSafra;
}

export class Safra extends Entity<SafraProps> {
  readonly #talhaoId: number;
  readonly #cultura: string;
  readonly #anoAgricola: string;
  readonly #dataPlantio: string | null;
  readonly #dataColheita: string | null;
  readonly #status: StatusSafra;

  constructor(props: SafraProps, id: number | null = null) {
    super(id);
    if (props.cultura.trim() === '') {
      throw new ValidationError('Cultura é obrigatória', { cultura: 'Campo obrigatório' });
    }
    if (!/^\d{4}\/\d{4}$/.test(props.anoAgricola)) {
      throw new ValidationError('Ano agrícola inválido', { anoAgricola: 'Use o formato AAAA/AAAA (ex.: 2026/2027)' });
    }
    if (props.dataPlantio && props.dataColheita && props.dataColheita < props.dataPlantio) {
      throw new ValidationError('Datas inconsistentes', {
        dataColheita: 'A colheita não pode ser anterior ao plantio',
      });
    }
    this.#talhaoId = props.talhaoId;
    this.#cultura = props.cultura;
    this.#anoAgricola = props.anoAgricola;
    this.#dataPlantio = props.dataPlantio;
    this.#dataColheita = props.dataColheita;
    this.#status = props.status;
  }

  toProps(): SafraProps {
    return {
      talhaoId: this.#talhaoId,
      cultura: this.#cultura,
      anoAgricola: this.#anoAgricola,
      dataPlantio: this.#dataPlantio,
      dataColheita: this.#dataColheita,
      status: this.#status,
    };
  }

  toJSON(): Record<string, unknown> {
    return { id: this.id, ...this.toProps() };
  }
}
