/**
 * Consulta de área já alocada em talhões. Pertence a quem a CONSOME (propriedades): o módulo de
 * talhões é que a implementa, e assim propriedades não depende de talhões (Inversão de Dependência).
 * O chamador deve ter validado antes que a propriedade pertence ao usuário.
 */
export interface AreaPorPropriedade {
  /** Soma (ha) das áreas dos talhões da propriedade, ignorando um talhão (o que está sendo editado). */
  somaAreas(propriedadeId: number, ignorarTalhaoId: number | null): Promise<number>;
}
