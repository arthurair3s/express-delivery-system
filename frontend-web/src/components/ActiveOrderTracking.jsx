import React, { useState, useEffect } from 'react';
import { ACOMPANHAR_PEDIDO, ATUALIZAR_STATUS_ENTREGA, SIMULAR_DESLOCAMENTO } from '../graphql/queries';
import TrackingMap from './TrackingMap';
import { API_URL } from '../config';

export default function ActiveOrderTracking({ pedidoId, restaurante, onCancel }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulando, setSimulando] = useState(false);

  useEffect(() => {
    // polling a cada 3 segundos
    const fetchStatus = () => {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ACOMPANHAR_PEDIDO,
          variables: { id: pedidoId }
        })
      })
        .then(r => r.json())
        .then(res => {
          if (res.errors) throw new Error(res.errors[0].message);
          setData(res.data.pedido);
          setLoading(false);
        })
        .catch(e => {
          console.error(e);
          setError(e);
          setLoading(false);
        });
    };

    fetchStatus(); // busca inicial
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [pedidoId]);

  const handleMudarStatus = async (novoStatus, entregaId) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ATUALIZAR_STATUS_ENTREGA,
          variables: { id: entregaId, status: novoStatus }
        })
      });
      // o polling busca a mudanca em 3s
    } catch (e) {
      console.error(e);
      alert("Erro ao mudar o status!");
    }
  };

  const handleIniciarSimulacao = async (entregaId) => {
    if (!entregaId) {
      alert("Aguarde a atribuição de um entregador...");
      return;
    }
    
    setSimulando(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: SIMULAR_DESLOCAMENTO,
          variables: { id: entregaId }
        })
      }).then(r => r.json());

      if (res.errors) throw new Error(res.errors[0].message);
      if (res.data.simularDeslocamento === false) {
          throw new Error("O servidor não conseguiu calcular a rota para a simulação.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar simulação: " + e.message);
    } finally {
      setSimulando(false);
    }
  };

  // Helper para formatar segundos em texto legível
  const formatarTempo = (segundos) => {
    if (!segundos || segundos <= 0) return 'Chegou!';
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min} min ${seg}s`;
  };

  if (loading && !data) {
    return <p className="text-center py-20 text-gray-500">Localizando seu Entregador...</p>;
  }

  const entrega = data?.entregas?.[0];
  const moto = entrega?.entregador;
  const rota = entrega?.rota?.caminho || [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in relative grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* 1. info de tracking */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-8 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Acompanhe seu pedido</h2>
            <p className="text-gray-500">Pedido #{pedidoId} de {restaurante?.nome}</p>
          </div>
          <button onClick={onCancel} className="text-sm font-medium text-red-500 hover:text-red-700 bg-red-50 px-3 py-1 rounded-full">
            Fechar Rastreamento
          </button>
        </div>

        <div className="glass-card p-6 flex-1 flex flex-col mb-4">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Status Atual</span>
            <span className={`status-badge ${entrega?.status?.toLowerCase() === 'entregue' ? 'status-entregue' : 'status-transito'}`}>
              {entrega?.status || data?.status || 'Processando'}
            </span>
          </div>

          <div className="border-l-2 border-gray-200 ml-3 pl-6 space-y-8 relative">
            <div className="relative">
              <span className={`absolute -left-8 w-4 h-4 rounded-full border-2 ${data?.status ? 'bg-ifoodRed border-white' : 'bg-gray-200 border-gray-200'}`}></span>
              <p className="font-medium text-gray-900">Preparando pedido no Restaurante</p>
            </div>
            <div className="relative">
              <span className={`absolute -left-8 w-4 h-4 rounded-full border-2 ${entrega?.status === 'EM_TRANSITO' || entrega?.status === 'ENTREGUE' ? 'bg-ifoodRed border-white' : 'bg-gray-200 border-gray-200'}`}></span>
              <p className="font-medium text-gray-900">Motoboy a caminho da sua casa</p>
            </div>
            <div className="relative">
              <span className={`absolute -left-8 w-4 h-4 rounded-full border-2 ${entrega?.status === 'ENTREGUE' ? 'bg-green-500 border-white' : 'bg-gray-200 border-gray-200'}`}></span>
              <p className="font-medium text-gray-900">Pedido Entregue</p>
            </div>
          </div>

          {moto && (
            <div className="mt-auto pt-6 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">🛵</div>
                <div>
                  <p className="text-sm text-gray-500">Seu entregador</p>
                  <p className="font-bold text-gray-900">{moto.nome}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. painel tecnico do motorista */}
      <div className="flex flex-col gap-4">
        <div className="glass-card p-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>

          <h3 className="font-medium text-slate-400 text-sm mb-4">Painel Técnico (Motorista Mock)</h3>
          
          {/* Lógica para escolher qual info de trajeto exibir */}
          {(() => {
            const rotaAtiva = 
              entrega?.status?.toUpperCase() === 'ATRIBUIDA' ? entrega?.rota_coleta :
              entrega?.status?.toUpperCase() === 'EM_TRANSITO' ? entrega?.rota_entrega :
              null;

            const dist = rotaAtiva?.distancia_total_km || 0;
            const tempo = rotaAtiva?.duracao_total_segundos || 0;

            return (
              <p className="text-xl font-bold mb-6">
                Próximo Alvo: <span className="text-blue-400">
                  {dist > 0 ? `${dist.toFixed(2)} km | ${formatarTempo(tempo)}` : 'Calculando...'}
                </span>
              </p>
            );
          })()}

          <div className="grid grid-cols-1 gap-3">
            <button
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
              onClick={() => handleIniciarSimulacao(entrega?.id)}
              disabled={simulando || !entrega || entrega?.status?.toUpperCase() === 'ENTREGUE'}
            >
              {simulando ? '⌛ processando...' : (
                !entrega ? 'Aguardando atribuição...' :
                entrega?.status?.toUpperCase() === 'ATRIBUIDA' ? '🛵 simular: ir para o restaurante' :
                  entrega?.status?.toUpperCase() === 'EM_TRANSITO' ? '🏠 simular: ir para o cliente' :
                    'iniciar deslocamento automatico'
              )}
            </button>
            <button
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition"
              onClick={() => handleMudarStatus('EM_TRANSITO', entrega?.id)}
              disabled={entrega?.status !== 'ATRIBUIDA'}
            >
              Simular: Motoboy Retirou do Restaurante
            </button>
            <button
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition"
              onClick={() => handleMudarStatus('ENTREGUE', entrega?.id)}
              disabled={entrega?.status !== 'EM_TRANSITO'}
            >
              Simular: Pedido Entregue!
            </button>
          </div>
        </div>

        {/* 3. mapa interativo (A-B-C) */}
        <div className="flex flex-col gap-4 mt-8 md:col-span-2">
          <TrackingMap 
            rotaColeta={entrega?.rota_coleta} 
            rotaEntrega={entrega?.rota_entrega} 
            motoPos={{ 
              latitude: Number(moto?.latitude) || 0,
              longitude: Number(moto?.longitude) || 0 
            }} 
            restaurantePos={{
              latitude: Number(restaurante?.latitude),
              longitude: Number(restaurante?.longitude)
            }}
            clientePos={{
              latitude: Number(data?.destino_latitude),
              longitude: Number(data?.destino_longitude)
            }}
          />
        </div>
      </div>
    </div>
  );
}
