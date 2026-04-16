import React, { useState, useEffect, useRef } from 'react';
import { ACOMPANHAR_PEDIDO, ATUALIZAR_STATUS_ENTREGA, SIMULAR_DESLOCAMENTO, CRIAR_AVALIACAO, BUSCAR_CANDIDATOS, ATRIBUIR_ENTREGADOR } from '../graphql/queries';
import TrackingMap from './TrackingMap';
import { API_URL } from '../config';
import { Star } from 'lucide-react';

export default function ActiveOrderTracking({ pedidoId, restaurante, onCancel }) {
  const [data, setData] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulando, setSimulando] = useState(false);

  // Estados para Avaliação
  const [showRating, setShowRating] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [ratingEnviado, setRatingEnviado] = useState(false);

  // Refs para evitar closures desatualizados no polling
  const ratingPromptedRef = useRef(false);
  const ratingSentRef = useRef(false);

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

          // Se acabou de chegar no status ENTREGUE, mostra modal se não tiver sido exibido ainda e não enviado
          const pedido = res.data.pedido;
          const statusEntrega = pedido?.entregas?.[0]?.status?.toUpperCase();
          if (statusEntrega === 'ENTREGUE' && !ratingPromptedRef.current && !ratingSentRef.current) {
            setShowRating(true);
            ratingPromptedRef.current = true;
          }
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

  useEffect(() => {
    // Polling de candidatos SOMENTE enquanto a entrega ainda não possui motoboy (não foi atribuída)
    const entregaOcupada = data?.entregas?.[0];
    if (entregaOcupada || !restaurante?.id) {
      if (candidatos.length > 0) setCandidatos([]);
      return;
    }

    const fetchCandidatos = () => {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: BUSCAR_CANDIDATOS,
          variables: { restauranteId: restaurante.id, raioKm: 3.0 }
        })
      })
      .then(r => r.json())
      .then(res => {
         if (!res.errors) {
           // Limita para no máximo 4 motoristas na tela para não poluir o mapa
           setCandidatos((res.data.entregadoresProximosAoRestaurante || []).slice(0, 4));
         }
      })
      .catch(console.error);
    };

    fetchCandidatos();
    const cadInterval = setInterval(fetchCandidatos, 3000);
    return () => clearInterval(cadInterval);
  }, [data, restaurante]);

  const handleAtribuirEntregador = async () => {
    setSimulando(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ATRIBUIR_ENTREGADOR,
          variables: { pedido_id: pedidoId }
        })
      }).then(r => r.json());

      if (res.errors) throw new Error(res.errors[0].message);
    } catch (e) {
      console.error(e);
      alert("Erro ao escolher entregador: " + e.message);
    } finally {
      setSimulando(false);
    }
  };

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

      if (novoStatus.toUpperCase() === 'ENTREGUE') {
        setShowRating(true);
        ratingPromptedRef.current = true;
      }
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

  const handleEnviarAvaliacao = async () => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('usuario') || '{}');
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CRIAR_AVALIACAO,
          variables: {
            usuario_id: savedUser.id || "1",
            restaurante_id: restaurante.id,
            nota: nota > 0 ? nota : null,
            comentario: comentario || null
          }
        })
      });
      setRatingEnviado(true);
      ratingSentRef.current = true;
      setShowRating(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar avaliação.");
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
            <span className={`status-badge ${entrega?.status?.toLowerCase() === 'entregue' ? 'status-entregue' : !entrega ? 'status-pendente bg-orange-100 text-orange-800' : 'status-transito'}`}>
              {entrega?.status || data?.status || 'Processando'}
            </span>
          </div>

          <div className="border-l-2 border-gray-200 ml-3 pl-6 space-y-8 relative">
            <div className="relative">
              <span className={`absolute -left-8 w-4 h-4 rounded-full border-2 ${data?.status && !entrega ? 'bg-orange-500 border-white' : data?.status ? 'bg-brandRed border-white' : 'bg-gray-200 border-gray-200'}`}></span>
              <p className="font-medium text-gray-900">Buscando Entregador</p>
            </div>
            <div className="relative">
              <span className={`absolute -left-8 w-4 h-4 rounded-full border-2 ${entrega?.status === 'EM_TRANSITO' || entrega?.status === 'ATRIBUIDA' ? 'bg-brandRed border-white' : 'bg-gray-200 border-gray-200'}`}></span>
              <p className="font-medium text-gray-900">A caminho da sua casa</p>
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
            if (!entrega) {
              return (
                <p className="text-xl font-bold mb-6">
                   Radar: <span className="text-orange-400">
                    {candidatos.length > 0 ? `${candidatos.length} entregadores próximos rápidos ⚡` : 'Escaneando a área...'}
                  </span>
                </p>
              )
            }
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
            {!entrega ? (
              <button
                className="bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                onClick={handleAtribuirEntregador}
                disabled={simulando || candidatos.length === 0}
              >
                {simulando ? '⌛ processando...' : 'Simular: Escolher Entregador Mágico'}
              </button>
            ) : (
              <button
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                onClick={() => handleIniciarSimulacao(entrega?.id)}
                disabled={simulando || entrega?.status?.toUpperCase() === 'ENTREGUE'}
              >
                {simulando ? '⌛ processando...' : (
                  entrega?.status?.toUpperCase() === 'ATRIBUIDA' ? '🛵 simular: ir para o restaurante' :
                    entrega?.status?.toUpperCase() === 'EM_TRANSITO' ? '🏠 simular: ir para o cliente' :
                      'iniciar deslocamento automatico'
                )}
              </button>
            )}
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
            status={entrega?.status?.toUpperCase() || ''}
            candidatos={candidatos}
            rotaColeta={entrega?.rota_coleta}
            rotaEntrega={entrega?.rota_entrega}
            motoPos={moto ? {
              latitude: Number(moto?.latitude) || 0,
              longitude: Number(moto?.longitude) || 0
            } : null}
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

      {showRating && !ratingEnviado && (
        <RatingModal
          nota={nota}
          setNota={setNota}
          comentario={comentario}
          setComentario={setComentario}
          onSend={handleEnviarAvaliacao}
          onSkip={() => setShowRating(false)}
          restauranteNome={restaurante?.nome || 'nossa loja'}
        />
      )}
    </div>
  );
}

function RatingModal({ nota, setNota, comentario, setComentario, onSend, onSkip, restauranteNome }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 bg-white shadow-2xl animate-scale-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">Pedido Entregue!</h2>
          <p className="text-gray-500 mt-2">Como foi sua experiência com o {restauranteNome}?</p>
        </div>

        {/* Estrelas */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setNota(star)}
              className="transition-transform active:scale-90 hover:scale-110"
            >
              <Star
                size={40}
                fill={(hover || nota) >= star ? "#fbbf24" : "transparent"}
                color={(hover || nota) >= star ? "#fbbf24" : "#cbd5e1"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {/* Comentário */}
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Escreva sua avaliação (opcional)..."
          className="w-full h-32 p-4 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-gray-700 mb-6"
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={onSend}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            Enviar Avaliação
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2 text-gray-400 font-medium hover:text-gray-600 transition-colors"
          >
            Pular agora
          </button>
        </div>
      </div>
    </div>
  );
}
