import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import MapaBase, { AjustarVista } from '../mapa/MapaBase';
import { ICONES, CORES_ROTA } from '../mapa/leaflet';

const CENTRO_PADRAO = [-22.9068, -43.1729];

const coordenada = (p) =>
  p && p.latitude != null && !isNaN(p.latitude)
    ? [Number(p.latitude), Number(p.longitude)]
    : null;

function Legenda() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-[10px] text-slate-300 flex flex-col gap-2 shadow-lg pointer-events-none">
      <div className="flex items-center gap-2">
        <div className="w-4 h-1 rounded-full" style={{ background: CORES_ROTA.coleta }} />
        <span>Coleta (Motorista → Loja)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-1 rounded-full" style={{ background: CORES_ROTA.entrega }} />
        <span>Entrega (Loja → Cliente)</span>
      </div>
    </div>
  );
}

export default function TrackingMap({
  status,
  rotaColeta,
  rotaEntrega,
  motoPos,
  restaurantePos,
  clientePos,
  candidatos = [],
}) {
  const coletaCoords = rotaColeta?.caminho?.map((p) => [p.latitude, p.longitude]) || [];
  const entregaCoords = rotaEntrega?.caminho?.map((p) => [p.latitude, p.longitude]) || [];

  const restPos = coordenada(restaurantePos);
  const destPos = coordenada(clientePos);
  const motoCoord = coordenada(motoPos);

  const showColeta = !status || status === 'ATRIBUIDA' || status === 'PENDENTE';
  const showEntrega = status === 'EM_TRANSITO';

  const pontos = [
    motoCoord,
    restPos,
    destPos,
    ...candidatos.map(coordenada),
    ...(showColeta ? coletaCoords : []),
    ...(showEntrega ? entregaCoords : []),
  ].filter(Boolean);

  return (
    <MapaBase
      expansivel
      altura="h-[400px]"
      center={motoCoord || restPos || CENTRO_PADRAO}
      zoom={13}
      legenda={<Legenda />}
    >
      {showColeta && coletaCoords.length > 0 && (
        <Polyline
          positions={coletaCoords}
          color={CORES_ROTA.coleta}
          weight={4}
          opacity={0.8}
          dashArray="10, 10"
        />
      )}

      {showEntrega && entregaCoords.length > 0 && (
        <Polyline positions={entregaCoords} color={CORES_ROTA.entrega} weight={5} opacity={0.9} />
      )}

      {candidatos.map((c) => {
        const pos = coordenada(c);
        return pos && <Marker key={c.id} position={pos} icon={ICONES.entregador} opacity={0.7} />;
      })}

      {motoCoord && <Marker position={motoCoord} icon={ICONES.entregador} />}
      {restPos && <Marker position={restPos} icon={ICONES.restaurante} />}
      {destPos && <Marker position={destPos} icon={ICONES.cliente} />}

      <AjustarVista pontos={pontos} centro={CENTRO_PADRAO} />
    </MapaBase>
  );
}
