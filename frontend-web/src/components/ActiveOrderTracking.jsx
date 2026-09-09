import React, { useState, useEffect, useRef } from 'react';
import { ACOMPANHAR_PEDIDO, CRIAR_AVALIACAO, BUSCAR_CANDIDATOS } from '../graphql/queries';
import TrackingMap from './TrackingMap';
import { API_URL } from '../config';
import { Star } from 'lucide-react';

export default function ActiveOrderTracking({ pedidoId, restaurante, onCancel }) {
  const [data, setData] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const token = localStorage.getItem('token');
      fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
          setLoading(false);
        });
    };

    fetchStatus(); // busca inicial
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [pedidoId]);

  useEffect(() => {
    // Polling de candidatos SOMENTE enquanto a entrega ainda não possui motoboy (não foi atribuída)
    if (data?.entregas?.[0] || !restaurante?.id) return;

    const fetchCandidatos = () => {
      const token = localStorage.getItem('token');
      fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

  const handleEnviarAvaliacao = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: CRIAR_AVALIACAO,
          variables: {
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

  if (loading && !data) {
    return <p className="text-center py-20 text-gray-500">Localizando seu Entregador...</p>;
  }

  const entrega = data?.entregas?.[0];
  const moto = entrega?.entregador;
  // Some com os candidatos assim que a entrega ganha um entregador
  const candidatosVisiveis = entrega ? [] : candidatos;

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

      {/* 2. mapa interativo (A-B-C) */}
      <div className="flex flex-col gap-4">
        <TrackingMap
          status={entrega?.status?.toUpperCase() || ''}
          candidatos={candidatosVisiveis}
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
