import React, { useState, useEffect } from 'react'
import RestaurantList from './components/RestaurantList'
import RestaurantMenu from './components/RestaurantMenu'
import ActiveOrderTracking from './components/ActiveOrderTracking'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import AddressBar from './components/AddressBar'
import RestaurantePanel from './components/RestaurantePanel'
import EntregadorPanel from './components/EntregadorPanel'
import { POVOAR_FROTA } from './graphql/queries'
import { API_URL } from './config'
import MeusPedidos from './components/MeusPedidos'

function App() {
  const [usuario, setUsuario] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [view, setView] = useState('login')
  const [activePedidoId, setActivePedidoId] = useState(() => {
    return localStorage.getItem('activePedidoId') || null;
  });
  const [selectedRestaurante, setSelectedRestaurante] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedRestaurante');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [povoando, setPovoando] = useState(false);

  useEffect(() => {
    if (activePedidoId) {
      localStorage.setItem('activePedidoId', activePedidoId);
    } else {
      localStorage.removeItem('activePedidoId');
    }
  }, [activePedidoId]);

  useEffect(() => {
    if (selectedRestaurante) {
      localStorage.setItem('selectedRestaurante', JSON.stringify(selectedRestaurante));
    } else {
      localStorage.removeItem('selectedRestaurante');
    }
  }, [selectedRestaurante]);

  // Verifica se já existe um token salvo ao carregar o app
  useEffect(() => {
    const savedUser = localStorage.getItem('usuario')
    const savedToken = localStorage.getItem('token')
    if (savedUser && savedToken) {
      try {
        setUsuario(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('usuario')
        localStorage.removeItem('token')
      }
    }
    setCheckingAuth(false)
  }, [])

  const handleLogin = (user) => {
    setUsuario(user)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
    setActivePedidoId(null)
    setSelectedRestaurante(null)
  }

  const handlePovoarMapa = async () => {
    setPovoando(true)
    try {
      await fetch(API_URL, {
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

  // Objeto de localizacao derivado do usuario
  const userLocation = {
    lat: usuario?.latitude,
    lon: usuario?.longitude,
    label: usuario?.endereco
  }

  // Tela de carregamento enquanto verifica auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Se não estiver logado, mostra o login
  if (!usuario) {
    if (view === 'register') {
      return (
        <RegisterPage 
          onBackToLogin={() => setView('login')} 
          onRegisterSuccess={() => {
            setView('login');
          }}
        />
      )
    }
    return <LoginPage onLogin={handleLogin} onRegister={() => setView('register')} />
  }

  // View Principal para usuários autenticados
  return (
    <div className="min-h-screen pt-4 pb-20 bg-slate-50/50">
      {/* Header Unificado */}
      <div className="max-w-5xl mx-auto px-4 mb-4 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🛵</span>
          <h1 className="text-2xl font-bold text-brandRed tracking-tight">
            Express Delivery
          </h1>
          <span className="text-xs bg-slate-100 border px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">
            {usuario.role}
          </span>
        </div>
        <div className="flex items-center gap-4 relative">
          
          <button
            onClick={handlePovoarMapa}
            disabled={povoando}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-medium transition"
          >
            {povoando ? 'povoando...' : '🚀 povoar mapa'}
          </button>

          {/* Info do usuário logado + Logout */}
          <div className="flex items-center gap-2 border-l pl-4 ml-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {usuario.nome.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{usuario.nome}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{usuario.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="text-gray-400 hover:text-red-500 transition ml-1 p-1 rounded-lg hover:bg-red-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Dinâmico com base no Modo e Estado do Pedido */}
      <div className="max-w-5xl mx-auto px-4">
        {usuario.role === 'RESTAURANTE' ? (
          <RestaurantePanel usuario={usuario} />
        ) : usuario.role === 'ENTREGADOR' ? (
          <EntregadorPanel usuario={usuario} />
        ) : activePedidoId ? (
          <ActiveOrderTracking
            pedidoId={activePedidoId}
            restaurante={selectedRestaurante}
            onCancel={() => {
              setActivePedidoId(null)
              setSelectedRestaurante(null)
            }}
          />
        ) : selectedRestaurante ? (
          <RestaurantMenu
            restaurante={selectedRestaurante}
            userLocation={userLocation}
            onBack={() => setSelectedRestaurante(null)}
            onOrderCreated={(pedidoId, rest) => {
              setSelectedRestaurante(rest)
              setActivePedidoId(pedidoId)
            }}
          />
        ) : (
          <>
            <AddressBar usuario={usuario} setUsuario={setUsuario} />
            <RestaurantList onSelectRestaurant={setSelectedRestaurante} />
            <MeusPedidos
              usuario={usuario}
              onSelectPedido={(pedidoId, restObj) => {
                setSelectedRestaurante(restObj)
                setActivePedidoId(pedidoId)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default App
