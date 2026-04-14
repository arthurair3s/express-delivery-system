import React, { useState } from 'react'
import RestaurantList from './components/RestaurantList'
import RestaurantMenu from './components/RestaurantMenu'
import ActiveOrderTracking from './components/ActiveOrderTracking'
import { POVOAR_FROTA } from './graphql/queries'

function App() {
  const [activePedidoId, setActivePedidoId] = useState(null)
  const [selectedRestaurante, setSelectedRestaurante] = useState(null)
  const [povoando, setPovoando] = useState(false)
  const [userLocation, setUserLocation] = useState({
    lat: -22.9035,
    lon: -43.1730,
    label: "Centro, Rio de Janeiro"
  })
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const handlePovoarMapa = async () => {
    setPovoando(true)
    try {
      await fetch('http://localhost:4000/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: POVOAR_FROTA })
      })
      alert('frota povoada com sucesso!')
    } catch (e) {
      console.error(e)
      alert('erro ao povoar mapa')
    } finally {
      setPovoando(false)
    }
  }

  const PRESETS = [
    { label: "Centro, RJ", lat: -22.9035, lon: -43.1730 },
    { label: "Cachambi, RJ", lat: -22.8861, lon: -43.2778 },
    { label: "Copacabana, RJ", lat: -22.9711, lon: -43.1843 }
  ];

  // mostra o rastreador se tiver pedido ativo
  if (activePedidoId) {
    return (
      <div className="min-h-screen pt-4">
        <ActiveOrderTracking
          pedidoId={activePedidoId}
          restaurante={selectedRestaurante}
          onCancel={() => {
            setActivePedidoId(null)
            setSelectedRestaurante(null)
          }}
        />
      </div>
    )
  }

  // mostra o menu do restaurante selecionado
  if (selectedRestaurante) {
    return (
      <div className="min-h-screen pt-4">
        <RestaurantMenu
          restaurante={selectedRestaurante}
          userLocation={userLocation}
          onBack={() => setSelectedRestaurante(null)}
          onOrderCreated={(pedidoId, rest) => {
            setSelectedRestaurante(rest)
            setActivePedidoId(pedidoId)
          }}
        />
      </div>
    )
  }

  // view principal: lista de restaurantes
  return (
    <div className="min-h-screen pt-4">
      <div className="max-w-5xl mx-auto px-4 mb-4 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🛵</span>
          <h1 className="text-2xl font-bold text-ifoodRed tracking-tight">
            Express Delivery
          </h1>
        </div>
        <div className="flex items-center gap-4 relative">
          <button
            onClick={handlePovoarMapa}
            disabled={povoando}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-medium transition"
          >
            {povoando ? 'povoando...' : '🚀 povoar mapa'}
          </button>

          <div
            className="text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-50 p-1 rounded transition"
            onClick={() => setShowLocationPicker(!showLocationPicker)}
          >
            Você está em:{' '}
            <span className="text-ifoodRed font-bold border-b border-dashed border-ifoodRed">
              {userLocation.label}
            </span>
          </div>

          {showLocationPicker && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white shadow-2xl rounded-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in duration-200">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 px-1">Selecione seu local:</h4>
              <div className="space-y-1">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setUserLocation(p);
                      setShowLocationPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${userLocation.label === p.label ? 'bg-red-50 text-ifoodRed font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    📍 {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t text-[10px] text-gray-400 text-center">
                Coordenadas: {userLocation.lat}, {userLocation.lon}
              </div>
            </div>
          )}
        </div>
      </div>

      <RestaurantList onSelectRestaurant={setSelectedRestaurante} />
    </div>
  )
}

export default App
