/**
 * Base de todas as entidades.
 * - O id é um campo privado nativo (#id): só é definido no construtor e nunca muda.
 * - `toProps()` devolve um retrato para persistência (inclui campos internos).
 * - `toJSON()` define o que a API expõe publicamente.
 */
export abstract class Entity<TProps extends object> {
  readonly #id: number | null;

  protected constructor(id: number | null) {
    this.#id = id;
  }

  get id(): number | null {
    return this.#id;
  }

  abstract toProps(): TProps;

  abstract toJSON(): Record<string, unknown>;
}
