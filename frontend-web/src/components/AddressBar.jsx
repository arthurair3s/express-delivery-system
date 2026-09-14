import React, { useState, useRef, useMemo, useEffect } from 'react';
import { MapPin, Search, Navigation, Check, X, Loader2, Edit2 } from 'lucide-react';
import { Marker } from 'react-leaflet';
import MapaBase, { AjustarVista } from '../mapa/MapaBase';
import { ICONES } from '../mapa/leaflet';
import { ATUALIZAR_ENDERECO } from '../graphql/queries';
import { API_URL } from '../config';

function DraggableMarker({ position, setPosition, onDragEnd }) {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const newPos = [latLng.lat, latLng.lng];
          setPosition(newPos);
          if (onDragEnd) {
            onDragEnd(newPos);
          }
        }
      },
    }),
    [setPosition, onDragEnd],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      icon={ICONES.cliente}
      ref={markerRef}
    />
  );
}

// Helpers para comunicação com Nominatim (Geocoding e Reverse Geocoding)
const geocodeAddress = async (addr) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`);
  if (!response.ok) throw new Error("Erro de conexão com Nominatim");
  const data = await response.json();
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name
    };
  }
  throw new Error("Endereço não localizado");
};

const reverseGeocode = async (lat, lon) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
  if (!response.ok) throw new Error("Erro de conexão com Nominatim");
  const data = await response.json();
  if (data && data.display_name) {
    return data.display_name;
  }
  return `Localização em (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
};

export default function AddressBar({ usuario, setUsuario }) {
  const [isEditing, setIsEditing] = useState(false);
  const [enderecoInput, setEnderecoInput] = useState('');
  const [tempCoords, setTempCoords] = useState([-22.9068, -43.1729]);
  
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);

  // Inicializa estados locais com os dados atuais do usuário
  const hasAddress = usuario?.latitude && usuario?.longitude && usuario?.endereco;

  useEffect(() => {
    if (usuario?.endereco) {
      setEnderecoInput(usuario.endereco);
    }
    if (usuario?.latitude && usuario?.longitude) {
      setTempCoords([Number(usuario.latitude), Number(usuario.longitude)]);
    }
  }, [usuario]);

  const startEditing = () => {
    setEnderecoInput(usuario?.endereco || '');
    setTempCoords(
      usuario?.latitude && usuario?.longitude 
        ? [Number(usuario.latitude), Number(usuario.longitude)] 
        : [-22.9068, -43.1729]
    );
    setIsEditing(true);
  };

  const handleLocalizar = async () => {
    if (!enderecoInput.trim()) {
      alert("Por favor, digite um endereço para buscar.");
      return;
    }
    setGeocodingLoading(true);
    try {
      const result = await geocodeAddress(enderecoInput);
      setTempCoords([result.lat, result.lon]);
      setEnderecoInput(result.display_name);
    } catch {
      alert("Não foi possível encontrar o endereço informado. Tente digitar de forma mais simples (ex: Rua Augusta, 100 - São Paulo).");
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleUseGPS = () => {
    setGeocodingLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setTempCoords([latitude, longitude]);
          try {
            const resolvedAddr = await reverseGeocode(latitude, longitude);
            setEnderecoInput(resolvedAddr);
          } catch (err) {
            console.error(err);
            setEnderecoInput(`Meu Local (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
          } finally {
            setGeocodingLoading(false);
          }
        },
        () => {
          setGeocodingLoading(false);
          alert("Não foi possível obter sua localização por GPS. Digite o endereço ou arraste o pin no mapa.");
        },
        { timeout: 8000 }
      );
    } else {
      setGeocodingLoading(false);
      alert("Geolocalização não é suportada pelo seu navegador.");
    }
  };

  const handleMarkerDragEnd = async (newCoords) => {
    setGeocodingLoading(true);
    try {
      const resolvedAddr = await reverseGeocode(newCoords[0], newCoords[1]);
      setEnderecoInput(resolvedAddr);
    } catch (err) {
      console.error("Erro na geocodificação reversa:", err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleSave = async () => {
    if (!enderecoInput.trim()) {
      alert("Por favor, forneça um endereço válido.");
      return;
    }
    setSavingLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: ATUALIZAR_ENDERECO,
          variables: {
            latitude: Number(tempCoords[0]),
            longitude: Number(tempCoords[1]),
            endereco: enderecoInput
          }
        })
      });

      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);

      const updatedUserData = result.data.atualizarEndereco;
      const updatedUser = { ...usuario, ...updatedUserData };
      
      setUsuario(updatedUser);
      localStorage.setItem('usuario', JSON.stringify(updatedUser));
      setIsEditing(false);
    } catch (err) {
      alert("Erro ao atualizar endereço: " + err.message);
    } finally {
      setSavingLoading(false);
    }
  };

  return (
    <div className={`w-full mb-8 rounded-3xl border transition-all duration-300 overflow-hidden ${
      !hasAddress 
        ? 'bg-amber-50/70 border-amber-200 shadow-md shadow-amber-100/50' 
        : 'bg-white border-slate-100 shadow-sm'
    }`}>
      {/* Modo de Visualização do Endereço */}
      {!isEditing ? (
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 w-full min-w-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              !hasAddress 
                ? 'bg-amber-500 text-white animate-pulse' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              <MapPin size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
                !hasAddress ? 'text-amber-700' : 'text-slate-400'
              }`}>
                {!hasAddress ? '⚠️ Endereço não configurado' : 'Entregar em:'}
              </h4>
              <p className={`text-sm font-bold truncate mt-0.5 ${
                !hasAddress ? 'text-amber-800' : 'text-slate-700'
              }`}>
                {usuario?.endereco || "Clique em configurar para definir seu endereço de entrega!"}
              </p>
            </div>
          </div>
          <button 
            onClick={startEditing}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              !hasAddress 
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
            }`}
          >
            <Edit2 size={13} />
            {hasAddress ? 'Alterar Endereço' : 'Configurar Endereço'}
          </button>
        </div>
      ) : (
        /* Modo de Edição / Configuração */
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800">Definir Endereço de Entrega</h3>
            <p className="text-xs text-slate-400 mt-0.5">Procure o endereço ou ajuste o pin no mapa abaixo.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Input e busca */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  className="w-full text-sm p-3.5 pr-10 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brandRed/20 focus:border-brandRed outline-none transition-all placeholder:text-slate-400 text-slate-700 font-semibold"
                  value={enderecoInput}
                  onChange={(e) => setEnderecoInput(e.target.value)}
                  placeholder="Ex: Avenida Paulista, 1000 - Bela Vista, São Paulo"
                  disabled={geocodingLoading || savingLoading}
                />
                {geocodingLoading && (
                  <div className="absolute right-3.5 top-3.5 text-slate-400 animate-spin">
                    <Loader2 size={20} />
                  </div>
                )}
              </div>
              <button 
                onClick={handleLocalizar}
                disabled={geocodingLoading || savingLoading}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-3.5 rounded-2xl transition flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
              >
                <Search size={14} />
                Localizar no Mapa
              </button>
            </div>

            {/* Ações Extras (GPS) */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleUseGPS}
                disabled={geocodingLoading || savingLoading}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                <Navigation size={13} className="text-blue-500 fill-blue-500/20" />
                Obter localização pelo GPS
              </button>
            </div>

            {/* Mapa Leaflet */}
            <div className="h-72 w-full rounded-2xl border border-slate-200/80 overflow-hidden relative shadow-inner">
              <MapaBase center={tempCoords} zoom={16} altura="h-full" moldura="">
                <DraggableMarker
                  position={tempCoords}
                  setPosition={setTempCoords}
                  onDragEnd={handleMarkerDragEnd}
                />
                <AjustarVista centro={tempCoords} zoom={16} />
              </MapaBase>
              <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 text-white text-[10px] font-bold py-1.5 px-3 rounded-full shadow backdrop-blur-sm pointer-events-none">
                📍 Arraste o pin no mapa para refinar a entrega
              </div>
            </div>

            {/* Botões de Ação Final */}
            <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
              <button 
                onClick={() => { setIsEditing(false); }}
                disabled={geocodingLoading || savingLoading}
                className="px-5 py-3 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs transition flex items-center gap-1.5 active:scale-95"
              >
                <X size={15} />
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={geocodingLoading || savingLoading || !enderecoInput.trim()}
                className="bg-brandRed hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-brandRed/20 transition flex items-center gap-1.5 active:scale-95"
              >
                {savingLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Salvar Endereço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
