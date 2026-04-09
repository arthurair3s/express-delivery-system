import React, { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import {
  GET_RESTAURANTES,
  CRIAR_PEDIDO,
  ACOMPANHAR_PEDIDO
} from '../graphql/queries'
import { Package, Utensils, MapPin, Clock, Navigation } from 'lucide-react'

export default function CustomerApp({ activePedidoId, setActivePedidoId }) {
  const { data: restData, loading: restLoading } = useQuery(GET_RESTAURANTES)
  const [criarPedido, { loading: criando }] = useMutation(CRIAR_PEDIDO)

  // Poll a cada 3 segundos caso tenha pedido ativo
  const {
    data: trackData,
    startPolling,
    stopPolling
  } = useQuery(ACOMPANHAR_PEDIDO, {
    variables: { id: activePedidoId },
    skip: !activePedidoId
  })

  useEffect(() => {
    if (activePedidoId) startPolling(3000)
    else stopPolling()
    return () => stopPolling()
  }, [activePedidoId, startPolling, stopPolling])

  const handleComprar = async restaurante => {
    try {
      // Usaremos sua casa como destino hardcoded para o MVP (Centro do RJ)
      const res = await criarPedido({
        variables: {
          restaurante_id: restaurante.id,
          destino_latitude: -22.9068, //-22.879285879767124,
          destino_longitude: -43.1729 // -43.254324102741975
        }
      })
      if (res.data?.criarPedido?.id) {
        setActivePedidoId(res.data.criarPedido.id)
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao criar pedido. Central de Entregas falhou?')
    }
  }

  const pedido = trackData?.pedido
  const entrega = pedido?.entregas?.[0]
  const resumo = entrega?.resumo_trajeto
  const rota = entrega?.rota?.caminho || []

  return (
    <div className="glass-panel animate-fade-in">
      <div className="panel-header">
        <h2 className="panel-title">
          <Utensils className="text-accent" />
          iFood Cliente
        </h2>
        {pedido && (
          <span
            className={`status-badge ${entrega?.status?.toLowerCase() || 'pendente'}`}
          >
            {entrega?.status || pedido.status}
          </span>
        )}
      </div>

      <div className="panel-content">
        {!activePedidoId ? (
          <>
            <p className="text-secondary mb-4">
              Escolha um restaurante da lista e faça seu pedido:
            </p>
            {restLoading && <p>Carregando Vitrine...</p>}
            <div className="grid" style={{ display: 'grid', gap: '16px' }}>
              {restData?.restaurantes?.map(r => (
                <div key={r.id} className="glass-card card">
                  <h3 className="card-title">{r.nome}</h3>
                  <p className="card-text mb-4 text-muted">
                    <MapPin size={14} className="inline mr-1" />
                    {r.endereco}
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={criando}
                    onClick={() => handleComprar(r)}
                  >
                    <Package size={16} /> Comprar Agora
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div className="glass-card" style={{ padding: '16px' }}>
              <h3 className="card-title">Acompanhar Entrega</h3>
              <p className="text-muted">
                Pedido #{pedido?.id} | Entregador:{' '}
                <strong className="text-primary">
                  {entrega?.entregador?.nome || 'Procurando...'}
                </strong>
              </p>

              {resumo && (
                <div
                  style={{ display: 'flex', gap: '20px', marginTop: '12px' }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Navigation size={18} className="text-accent" />{' '}
                    {resumo.distancia_km.toFixed(1)} km
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Clock size={18} className="text-warning" />{' '}
                    {Math.ceil(resumo.duracao_estimada_segundos / 60)} min
                  </span>
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                minHeight: '350px'
              }}
            >
              {rota.length > 0 ? (
                <MapContainer
                  center={[rota[0].latitude, rota[0].longitude]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {/* Caminho Vermelho-Laranja para rota */}
                  <Polyline
                    positions={rota.map(p => [p.latitude, p.longitude])}
                    color={
                      entrega?.status === 'EM_TRANSITO' ? '#10b981' : '#f59e0b'
                    }
                    weight={5}
                    opacity={0.8}
                  />

                  {/* Marcador Motoboy (Início da Rota) */}
                  <Marker position={[rota[0].latitude, rota[0].longitude]}>
                    <Popup>Motoboy Aqui!</Popup>
                  </Marker>

                  {/* Marcador Destino (Fim da Rota) */}
                  <Marker
                    position={[
                      rota[rota.length - 1].latitude,
                      rota[rota.length - 1].longitude
                    ]}
                  >
                    <Popup>Destino</Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <p className="text-secondary">Processando Rota OSRM...</p>
                </div>
              )}
            </div>

            <button
              className="btn btn-danger"
              onClick={() => setActivePedidoId(null)}
            >
              Cancelar Visualização
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
