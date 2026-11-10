/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  /** Chave pública da Google Maps JavaScript API (vem de GOOGLE_MAPS_API_KEY no build do Docker). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface Window {
  /** Callback oficial do Google Maps para chave inválida/não autorizada. */
  gm_authFailure?: () => void;
}
