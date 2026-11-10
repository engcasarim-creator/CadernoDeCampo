/** Chave pública da Google Maps JavaScript API (definida no build; restrinja-a por HTTP referrer no Google Cloud). */
export const GOOGLE_MAPS_API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export const googleMapsConfigurado = GOOGLE_MAPS_API_KEY.trim() !== '';

let carregamento: Promise<void> | null = null;

/** Carrega o script do Google Maps uma única vez e devolve quando as bibliotecas `maps` e `marker` estão prontas. */
export function carregarGoogleMaps(): Promise<void> {
  if (!googleMapsConfigurado) return Promise.reject(new Error('Chave do Google Maps não configurada'));
  if (carregamento) return carregamento;

  carregamento = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const params = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY, v: 'weekly', loading: 'async', language: 'pt-BR' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error('Não foi possível carregar o Google Maps'));
    script.onload = () => {
      Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')])
        .then(() => resolve())
        .catch(reject);
    };
    document.head.appendChild(script);
  }).catch((erro: unknown) => {
    carregamento = null; // permite tentar de novo
    throw erro;
  });
  return carregamento;
}

/** Link para abrir um ponto no Google Maps (usado quando o mapa interativo não está disponível). */
export function linkGoogleMaps(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
