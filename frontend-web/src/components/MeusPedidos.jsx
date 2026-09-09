import React, { useState, useEffect } from 'react';
import { GET_MEUS_PEDIDOS, GET_RESTAURANTES } from '../graphql/queries';
import { API_URL } from '../config';

export default function MeusPedidos({ usuario, onSelectPedido }) {
  const [pedidos, setPedidos] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Carrega todos os restaurantes para poder cruzar o nome do restaurante pelo id
  const fetchRestaurantes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: GET_RESTAURANTES })
      }).then(r => r.json());
      if (res.data?.restaurantes) {
        setRestaurantes(res.data.restaurantes);
      }
    } catch (e) {
      console.error('Erro ao buscar restaurantes:', e);
    }
  };

  const fetchPedidos = async () => {
    if (!usuario?.id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: GET_MEUS_PEDIDOS
        })
      }).then(r => r.json());
      
      if (res.errors) throw new Error(res.errors[0].message);
      
      const list = res.data.meusPedidos || [];
      // Ordena decrescente por id do pedido (mais recentes primeiro)
      const sorted = [...list].sort((a, b) => Number(b.id) - Number(a.id));
      setPedidos(sorted);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurantes();
    fetchPedidos();

    // Polling de pedidos a cada 5 segundos para atualizar status em tempo real
    const interval = setInterval(fetchPedidos, 5000);
    return () => clearInterval(interval);
  }, [usuario?.id]);

  const getRestauranteNome = (restauranteId) => {
    const rest = restaurantes.find(r => String(r.id) === String(restauranteId));
    return rest ? rest.nome : `Restaurante #${restauranteId}`;
  };

  const getRestauranteObj = (restauranteId) => {
    return restaurantes.find(r => String(r.id) === String(restauranteId)) || null;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDENTE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EM_PREPARO_ENTREGA': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EM_TRANSITO': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ENTREGUE': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELADO': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Sem data';
    const num = Number(dataStr);
    const parsed = new Date(isNaN(num) ? dataStr : num);
    return isNaN(parsed.getTime()) ? dataStr : parsed.toLocaleString('pt-BR');
  };

  if (loading && pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-3xl mt-6 shadow-sm">
        <div className="w-8 h-8 border-4 border-brandRed border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-3 text-gray-500 text-sm">Carregando histórico de pedidos...</p>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return null; // Não exibe a seção se o cliente não tiver nenhum pedido ainda
  }

  return (
    <div className="mt-10 bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🛍️</span> Meus Pedidos Recentes
          </h2>
          <p className="text-xs text-gray-400 mt-1">Acompanhe e acesse seus pedidos realizados a qualquer momento.</p>
        </div>
        <button
          onClick={fetchPedidos}
          className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 font-bold transition"
        >
          🔄 Atualizar lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
        {pedidos.map(p => {
          const restObj = getRestauranteObj(p.restaurante_id);
          const isAtivo = p.status !== 'ENTREGUE' && p.status !== 'CANCELADO';
          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between gap-4 ${
                isAtivo 
                  ? 'bg-red-50/10 border-red-100/70 hover:border-brandRed/30' 
                  : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-gray-900 text-sm">
                    Pedido #{p.id}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getStatusStyle(p.status)}`}>
                    {p.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{getRestauranteNome(p.restaurante_id)}</h4>
                  <p className="text-[10px] text-gray-400">Realizado em: {formatarData(p.data_criacao)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-200 mt-2">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Total pago</p>
                  <p className="text-sm font-extrabold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total)}
                  </p>
                </div>

                <button
                  onClick={() => onSelectPedido(p.id, restObj)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    isAtivo 
                      ? 'bg-brandRed text-white hover:bg-brandRed-dark shadow-md shadow-red-500/10' 
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                  }`}
                >
                  {isAtivo ? '🛵 Acompanhar Rota' : '👁️ Ver Detalhes'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
