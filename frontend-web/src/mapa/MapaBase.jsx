import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { TILE } from './leaflet';

/**
 * Enquadra o mapa a partir dos pontos que precisam ficar visíveis.
 *
 * A dependência do efeito é uma chave derivada das coordenadas, e não o array
 * em si: o pai recria esse array a cada render — e alguns deles fazem polling —
 * então depender da identidade do objeto reenquadrava o mapa de segundo em
 * segundo, desfazendo o pan que o usuário tinha acabado de dar.
 */
export function AjustarVista({ pontos, centro, zoom = 15 }) {
  const map = useMap();

  const visiveis = (pontos || []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  const chave = visiveis.length
    ? visiveis.map((p) => p.join(',')).join('|')
    : (centro || []).join(',');

  useEffect(() => {
    // o container pode ter mudado de tamanho desde a última medição — ao abrir
    // um modal, por exemplo — e sem isso o leaflet desenha sobre a área antiga
    map.invalidateSize();

    if (visiveis.length > 1) {
      map.fitBounds(visiveis, { padding: [50, 50], maxZoom: 16 });
    } else if (visiveis.length === 1) {
      map.setView(visiveis[0], zoom);
    } else if (centro) {
      map.setView(centro, zoom);
    }
    // `visiveis` e `centro` são recriados a cada render; `chave` é o que
    // realmente muda quando as coordenadas mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, zoom, map]);

  return null;
}

const IconeExpandir = ({ expandido }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {expandido ? (
      <path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" />
    ) : (
      <path d="m15 3 6 6M9 21l-6-6M21 3l-6 6M3 21l6-6" />
    )}
  </svg>
);

/**
 * Base compartilhada por todos os mapas do app.
 *
 * Existe porque os quatro mapas divergiam em tudo que o usuário percebe: dois
 * temas de tile diferentes (dois deles no mesmo painel), zoom com e sem
 * controle, e atribuição presente em apenas um — o que, além de inconsistente,
 * é exigência de licença do OSM.
 *
 * O zoom por rolagem fica desligado de propósito: todos estes mapas vivem
 * dentro de páginas roláveis, e capturar a roda prendia a rolagem da página em
 * cima do mapa. Os botões de zoom cobrem o caso, e o pinça continua valendo no
 * toque. Em tela cheia não há página para rolar, então lá a roda volta a ser
 * zoom.
 */
export default function MapaBase({
  children,
  altura = 'h-[400px]',
  expansivel = false,
  moldura = 'rounded-2xl',
  legenda = null,
  ...props
}) {
  const [expandido, setExpandido] = useState(false);

  // Esc fecha a tela cheia — sem isso o único jeito de sair é achar o botão
  useEffect(() => {
    if (!expandido) return;
    const aoTeclar = (e) => e.key === 'Escape' && setExpandido(false);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [expandido]);

  return (
    <div
      className={
        expandido
          ? 'fixed inset-4 z-[9999] bg-slate-100 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]'
          : `relative w-full overflow-hidden ${altura} ${moldura}`
      }
    >
      {expansivel && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          title={expandido ? 'Reduzir mapa' : 'Expandir mapa'}
          aria-label={expandido ? 'Reduzir mapa' : 'Expandir mapa'}
          className="absolute top-3 right-3 z-[10000] bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl backdrop-blur-md shadow-lg transition-transform active:scale-90"
        >
          <IconeExpandir expandido={expandido} />
        </button>
      )}

      <MapContainer
        scrollWheelZoom={expandido}
        zoomControl
        style={{ height: '100%', width: '100%' }}
        {...props}
      >
        <TileLayer url={TILE.url} attribution={TILE.attribution} />
        {children}
      </MapContainer>

      {legenda}
    </div>
  );
}
