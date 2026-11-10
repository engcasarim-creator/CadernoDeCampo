import { useEffect, useRef, useState } from 'react';
import { propriedadesApi } from '../../api/resources';
import type { Propriedade } from '../../types';
import { formatNumber } from '../../utils/format';
import { carregarGoogleMaps, googleMapsConfigurado, linkGoogleMaps } from '../../utils/googleMaps';

interface PropriedadeLocalizada extends Propriedade {
  latitude: number;
  longitude: number;
}

const temLocalizacao = (p: Propriedade): p is PropriedadeLocalizada => p.latitude !== null && p.longitude !== null;

/** Busca todas as propriedades do usuário (a API é paginada). */
async function carregarTodas(): Promise<Propriedade[]> {
  const todas: Propriedade[] = [];
  let page = 1;
  for (;;) {
    const resposta = await propriedadesApi.list({ page, limit: 100 });
    todas.push(...resposta.data);
    if (page >= resposta.totalPages) return todas;
    page += 1;
  }
}

function conteudoDoBalao(p: PropriedadeLocalizada): HTMLElement {
  // textContent (e não innerHTML): o nome vem do usuário e não pode virar HTML.
  const caixa = document.createElement('div');
  const titulo = document.createElement('strong');
  titulo.textContent = p.nome;
  const detalhe = document.createElement('div');
  detalhe.textContent = `${p.municipio}/${p.uf} — ${formatNumber(p.areaHa)} ha`;
  caixa.append(titulo, detalhe);
  return caixa;
}

/** Lista simples (e links para o Google Maps) usada quando o mapa interativo não pode ser exibido. */
function ListaDeLocais({ propriedades, motivo }: { propriedades: PropriedadeLocalizada[]; motivo: string }) {
  return (
    <div className="mapa-fallback">
      <p className="hint-text">{motivo}</p>
      <ul>
        {propriedades.map((p) => (
          <li key={p.id}>
            <a href={linkGoogleMaps(p.latitude, p.longitude)} target="_blank" rel="noopener noreferrer">
              {p.nome}
            </a>{' '}
            — {p.municipio}/{p.uf} ({p.latitude.toFixed(5)}, {p.longitude.toFixed(5)})
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mapa do Google com um ponto no centroide de cada propriedade cadastrada. */
export function MapaPropriedades() {
  const container = useRef<HTMLDivElement>(null);
  const [propriedades, setPropriedades] = useState<Propriedade[] | null>(null);
  const [erroDados, setErroDados] = useState(false);
  const [erroMapa, setErroMapa] = useState<string | null>(googleMapsConfigurado ? null : 'semChave');

  useEffect(() => {
    let ativo = true;
    carregarTodas()
      .then((lista) => ativo && setPropriedades(lista))
      .catch(() => ativo && setErroDados(true));
    return () => {
      ativo = false;
    };
  }, []);

  const localizadas = propriedades?.filter(temLocalizacao) ?? [];
  const semLocalizacao = (propriedades?.length ?? 0) - localizadas.length;

  useEffect(() => {
    if (!propriedades || localizadas.length === 0 || !googleMapsConfigurado) return;
    let ativo = true;
    // O Google chama esta função quando a chave é inválida ou não autorizada para este endereço.
    window.gm_authFailure = () => ativo && setErroMapa('chaveInvalida');

    carregarGoogleMaps()
      .then(() => {
        if (!ativo || !container.current) return;
        const mapa = new google.maps.Map(container.current, {
          center: { lat: localizadas[0].latitude, lng: localizadas[0].longitude },
          zoom: 12,
          mapId: 'DEMO_MAP_ID',
          mapTypeId: 'hybrid',
          streetViewControl: false,
        });
        const balao = new google.maps.InfoWindow();
        const limites = new google.maps.LatLngBounds();
        for (const p of localizadas) {
          const posicao = { lat: p.latitude, lng: p.longitude };
          const marcador = new google.maps.marker.AdvancedMarkerElement({ map: mapa, position: posicao, title: p.nome });
          marcador.addListener('gmp-click', () => {
            balao.setContent(conteudoDoBalao(p));
            balao.open({ map: mapa, anchor: marcador });
          });
          limites.extend(posicao);
        }
        // Uma propriedade: zoom fixo; várias: enquadra todas.
        if (localizadas.length > 1) mapa.fitBounds(limites, 48);
      })
      .catch(() => ativo && setErroMapa('falhaCarga'));

    return () => {
      ativo = false;
      window.gm_authFailure = undefined;
    };
    // `localizadas` é derivado de `propriedades`; basta reagir a ela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propriedades]);

  let corpo;
  if (erroDados) corpo = <p className="hint-text">Não foi possível carregar as propriedades para o mapa.</p>;
  else if (propriedades === null) corpo = <p className="loading">Carregando mapa…</p>;
  else if (localizadas.length === 0)
    corpo = (
      <p className="hint-text">
        Nenhuma propriedade com localização ainda. Informe latitude e longitude do centroide ao cadastrar ou editar uma
        propriedade.
      </p>
    );
  else if (erroMapa === 'semChave')
    corpo = (
      <ListaDeLocais
        propriedades={localizadas}
        motivo="Mapa interativo desativado: defina a chave GOOGLE_MAPS_API_KEY para exibi-lo. Enquanto isso, abra cada ponto no Google Maps:"
      />
    );
  else if (erroMapa === 'chaveInvalida')
    corpo = (
      <ListaDeLocais
        propriedades={localizadas}
        motivo="O Google recusou a chave do mapa (verifique a chave e as restrições de endereço). Abra cada ponto no Google Maps:"
      />
    );
  else if (erroMapa === 'falhaCarga')
    corpo = <ListaDeLocais propriedades={localizadas} motivo="Não foi possível carregar o Google Maps. Abra cada ponto no Google Maps:" />;
  else corpo = <div ref={container} className="mapa-propriedades" role="region" aria-label="Mapa das propriedades" />;

  return (
    <section className="card mapa-card">
      <h2>Mapa das propriedades</h2>
      {corpo}
      {semLocalizacao > 0 && localizadas.length > 0 && (
        <p className="hint-text">
          {semLocalizacao} propriedade(s) sem localização não aparecem no mapa. Edite-as para informar o centroide.
        </p>
      )}
    </section>
  );
}
