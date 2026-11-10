const RAIO_DA_TERRA_M = 6_371_008.8;
const paraRadianos = (graus: number): number => (graus * Math.PI) / 180;

export interface Coordenada {
  latitude: number;
  longitude: number;
}

export interface CaixaGeografica {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const dLat = paraRadianos(b.latitude - a.latitude);
  const dLng = paraRadianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(a.latitude)) * Math.cos(paraRadianos(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_DA_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Retângulo que contém todo ponto a até `raioM` metros do centro. Serve de pré-filtro barato no banco
 * (usa índice); a distância exata é conferida depois com `distanciaMetros`.
 */
export function caixaEmVolta(centro: Coordenada, raioM: number): CaixaGeografica {
  const dLat = (raioM / RAIO_DA_TERRA_M) * (180 / Math.PI);
  // Perto dos polos o cosseno tende a 0: limita para não dividir por quase zero.
  const cos = Math.max(Math.cos(paraRadianos(centro.latitude)), 0.01);
  const dLng = dLat / cos;
  return {
    latMin: centro.latitude - dLat,
    latMax: centro.latitude + dLat,
    lngMin: centro.longitude - dLng,
    lngMax: centro.longitude + dLng,
  };
}
