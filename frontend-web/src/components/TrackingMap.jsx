import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// correcao de icones padrao do leaflet no react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// icones personalizados
const motoristaIcon = L.divIcon({
  html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); cursor: pointer;">🛵</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const restauranteIcon = L.divIcon({
  html: '<div style="font-size: 24px;">🏢</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const clienteIcon = L.divIcon({
  html: '<div style="font-size: 24px;">🏠</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// componente para ajustar o zoom automaticamente
function RecenterMap({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, map]);
  return null;
}

export default function TrackingMap({ rotaColeta, rotaEntrega, motoPos }) {
  const coletaCoords = rotaColeta?.caminho?.map(p => [p.latitude, p.longitude]) || [];
  const entregaCoords = rotaEntrega?.caminho?.map(p => [p.latitude, p.longitude]) || [];

  // calcula os bounds para enquadrar tudo
  const allPoints = [...coletaCoords, ...entregaCoords];
  if (motoPos) allPoints.push([motoPos.latitude, motoPos.longitude]);
  
  const bounds = allPoints.length > 0 ? L.latLngBounds(allPoints) : null;

  // coordenadas dos pontos de interesse
  const restPos = entregaCoords[0] || coletaCoords[coletaCoords.length - 1];
  const destPos = entregaCoords[entregaCoords.length - 1];

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden glass-card border-none shadow-2xl relative">
      <MapContainer 
        center={motoPos ? [motoPos.latitude, motoPos.longitude] : [-22.9068, -43.1729]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* rota de coleta (driver -> store) em azul */}
        {coletaCoords.length > 0 && (
          <Polyline 
            positions={coletaCoords} 
            color="#38bdf8" 
            weight={4} 
            opacity={0.8} 
            dashArray="10, 10" 
          />
        )}

        {/* rota de entrega (store -> guest) em verde */}
        {entregaCoords.length > 0 && (
          <Polyline 
            positions={entregaCoords} 
            color="#10b981" 
            weight={5} 
            opacity={0.9} 
          />
        )}

        {/* marcadores */}
        {motoPos && (
          <Marker position={[motoPos.latitude, motoPos.longitude]} icon={motoristaIcon} />
        )}

        {restPos && (
          <Marker position={restPos} icon={restauranteIcon} />
        )}

        {destPos && (
          <Marker position={destPos} icon={clienteIcon} />
        )}

        {bounds && <RecenterMap bounds={bounds} />}
      </MapContainer>

      {/* legenda simples */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-[10px] text-slate-300 flex flex-col gap-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-sky-400 rounded-full"></div>
          <span>Coleta (Motorista → Loja)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-emerald-500 rounded-full"></div>
          <span>Entrega (Loja → Cliente)</span>
        </div>
      </div>
    </div>
  );
}
