import { ValidationError } from '../../shared/errors';
import { Entity } from '../../shared/crud/Entity';
import { formatarCar, formatarCcir, problemaNoCar, problemaNoCcir } from './identificadores';

export interface PropriedadeProps {
  usuarioId: number;
  nome: string;
  municipio: string;
  uf: string;
  areaHa: number;
  /** Centroide da propriedade (graus decimais). Nulos só em propriedades antigas, cadastradas antes do mapa. */
  latitude: number | null;
  longitude: number | null;
  /** CAR e CCIR já normalizados (sem pontuação). Nulos só em propriedades antigas, cadastradas antes desta regra. */
  car: string | null;
  ccir: string | null;
}

export class Propriedade extends Entity<PropriedadeProps> {
  readonly #usuarioId: number;
  readonly #nome: string;
  readonly #municipio: string;
  readonly #uf: string;
  readonly #areaHa: number;
  readonly #latitude: number | null;
  readonly #longitude: number | null;
  readonly #car: string | null;
  readonly #ccir: string | null;

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
    const { latitude, longitude } = props;
    if ((latitude === null) !== (longitude === null)) {
      throw new ValidationError('Localização incompleta', {
        [latitude === null ? 'latitude' : 'longitude']: 'Informe latitude e longitude juntas',
      });
    }
    if (latitude !== null && !(latitude >= -90 && latitude <= 90)) {
      throw new ValidationError('Latitude inválida', { latitude: 'Deve estar entre -90 e 90' });
    }
    if (longitude !== null && !(longitude >= -180 && longitude <= 180)) {
      throw new ValidationError('Longitude inválida', { longitude: 'Deve estar entre -180 e 180' });
    }
    if (props.car !== null) {
      const problema = problemaNoCar(props.car, props.uf);
      if (problema) throw new ValidationError('CAR inválido', { car: problema });
    }
    if (props.ccir !== null) {
      const problema = problemaNoCcir(props.ccir);
      if (problema) throw new ValidationError('CCIR inválido', { ccir: problema });
    }
    this.#usuarioId = props.usuarioId;
    this.#nome = props.nome;
    this.#municipio = props.municipio;
    this.#uf = props.uf;
    this.#areaHa = props.areaHa;
    this.#latitude = latitude;
    this.#longitude = longitude;
    this.#car = props.car;
    this.#ccir = props.ccir;
  }

  toProps(): PropriedadeProps {
    return {
      usuarioId: this.#usuarioId,
      nome: this.#nome,
      municipio: this.#municipio,
      uf: this.#uf,
      areaHa: this.#areaHa,
      latitude: this.#latitude,
      longitude: this.#longitude,
      car: this.#car,
      ccir: this.#ccir,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nome: this.#nome,
      municipio: this.#municipio,
      uf: this.#uf,
      areaHa: this.#areaHa,
      latitude: this.#latitude,
      longitude: this.#longitude,
      car: this.#car === null ? null : formatarCar(this.#car),
      ccir: this.#ccir === null ? null : formatarCcir(this.#ccir),
    };
  }
}
