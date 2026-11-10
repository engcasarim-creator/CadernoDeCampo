/** Arredonda para 2 casas decimais (evita ruído de ponto flutuante em somas de áreas e custos). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formata número no padrão brasileiro para mensagens ao usuário (ex.: 1.234,5). */
export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
