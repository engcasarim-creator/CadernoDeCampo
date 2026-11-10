/** Gera dados de propriedade válidos e DISTINTOS entre si (CAR, CCIR e centroide ~1 km um do outro). */
let contador = 0;

export function dadosPropriedade(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const n = ++contador;
  const hash = n.toString(16).toUpperCase().padStart(32, '0');
  return {
    nome: `Fazenda ${n}`,
    municipio: 'Tibagi',
    uf: 'PR',
    areaHa: 100,
    latitude: -24.5 - n * 0.01,
    longitude: -50.4,
    car: `PR-4127106-${hash}`,
    ccir: String(1000000000000 + n),
    ...extra,
  };
}
