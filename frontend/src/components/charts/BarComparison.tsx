export interface Bar {
  label: string;
  value: number;
  /** Define a cor da barra (ver .bar-fill.* no CSS). */
  tone: 'plantio' | 'colheita';
}

interface BarComparisonProps {
  title: string;
  bars: Bar[];
  format(value: number): string;
  /** Frase que explica a diferença entre as barras. */
  summary: string;
}

/**
 * Gráfico de barras horizontais genérico (sem biblioteca externa).
 * As barras usam a mesma escala (a maior ocupa 100%), então dá para comparar visualmente.
 */
export function BarComparison({ title, bars, format, summary }: BarComparisonProps) {
  const max = Math.max(...bars.map((bar) => bar.value), 0);

  return (
    <figure className="bar-comparison">
      <figcaption className="bar-title">{title}</figcaption>
      {bars.map((bar) => {
        const percent = max > 0 ? (bar.value / max) * 100 : 0;
        // Barras com valor > 0 nunca somem por serem muito pequenas perto da maior.
        const width = bar.value > 0 ? Math.max(percent, 2) : 0;
        return (
          <div key={bar.label} className="bar-row" role="img" aria-label={`${bar.label}: ${format(bar.value)}`}>
            <span className="bar-label">{bar.label}</span>
            <span className="bar-track">
              <span className={`bar-fill ${bar.tone}`} style={{ width: `${width}%` }} />
            </span>
            <span className="bar-value">{format(bar.value)}</span>
          </div>
        );
      })}
      <p className="bar-summary">{summary}</p>
    </figure>
  );
}
