import React, { useState } from 'react'
import RestaurantList from './components/RestaurantList'
import RestaurantMenu from './components/RestaurantMenu'
import ActiveOrderTracking from './components/ActiveOrderTracking'
import { POVOAR_FROTA } from './graphql/queries'

function App() {
  const [activePedidoId, setActivePedidoId] = useState(null)
  const [selectedRestaurante, setSelectedRestaurante] = useState(null)
  const [povoando, setPovoando] = useState(false)

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
        <div className="flex items-center gap-4">
          <button
            onClick={handlePovoarMapa}
            disabled={povoando}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-medium transition"
          >
            {povoando ? 'povoando...' : '🚀 povoar mapa'}
          </button>
          <div className="text-sm font-medium text-gray-500">
            Você está em:{' '}
            <span className="text-slate-800">Zona Norte - RJ</span>
          </div>
        </div>
      </div>

      <RestaurantList onSelectRestaurant={setSelectedRestaurante} />
    </div>
  )
}

export default App
