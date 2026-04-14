import * as entregaRepository from './entregaRepository.js'
import * as pedidoRepository from '../pedido/pedidoRepository.js'
import * as restauranteRepository from '../restaurante/restauranteRepository.js'
import * as entregadorService from '../entregador/entregadorService.js'
import * as roteamentoService from '../roteamento/roteamentoService.js'

const activeSimulations = new Map();
const routeCache = new Map(); // cache de trajeto por entrega/status

export const listar = async () => {
  return entregaRepository.listarEntregas()
}

export const buscarPorId = async id => {
  return entregaRepository.buscarEntregaPorId(id)
}

export const criar = async entrega => {
  return entregaRepository.criarEntrega(entrega)
}

export const editarPorId = async (id, entrega) => {
  return entregaRepository.editarEntregaPorId(id, entrega)
}

export const deletar = async id => {
  return entregaRepository.deletarEntrega(id)
}

export const buscarPorPedidoId = async id => {
  return entregaRepository.buscarEntregaPorPedidoId(id)
}

export const buscarPorEntregadorId = async id => {
  return entregaRepository.buscarEntregaPorEntregadorId(id)
}

export const atribuirMelhorEntregador = async pedidoId => {
  const pedido = await pedidoRepository.buscarPedidoPorId(pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado.')

  const restaurante = await restauranteRepository.buscarRestaurantePorId(pedido.restaurante_id)
  if (!restaurante || !restaurante.latitude || !restaurante.longitude) {
    throw new Error('Restaurante sem coordenadas geográficas cadastradas.')
  }

  // 1. busca entregadores proximos (2.5km) via grpc - Raio reduzido conforme solicitado
  let candidatos = await entregadorService.listarProximosAoRestaurante(restaurante.id, 2.5)
  
  if (!candidatos || candidatos.length === 0) {
    console.log(`[Módulo Inteligente] Ninguém a 2,5km. Tentando busca elástica de 7,5km...`);
    candidatos = await entregadorService.listarProximosAoRestaurante(restaurante.id, 7.5);
  }

  let melhor = null
  let etaFinal = 0

  if (!candidatos || candidatos.length === 0) {
    console.warn('[Módulo Inteligente] >>> RADAR VAZIO. Ativando Modo de Segurança (Teletransporte)...');
    
    // 2a. Busca qualquer entregador cadastrado no Postgres
    const todos = await entregadorService.listar();
    if (!todos || todos.length === 0) {
      throw new Error('Nenhum entregador cadastrado no sistema. Por favor, clique em "Povoar Frota" primeiro.');
    }

    melhor = todos[0];
    console.log(`[Módulo Inteligente] >>> Selecionado entregador aleatório para simulação: ${melhor.nome} (ID: ${melhor.id})`);
    
    // 2b. Teletransporta o motoboy para perto do restaurante (aprox 500m)
    const forceLat = restaurante.latitude + 0.005;
    const forceLon = restaurante.longitude + 0.005;
    await entregadorService.atualizarLocalizacao(melhor.id, forceLat, forceLon);
    await entregadorService.atualizarStatus(melhor.id, 'DISPONIVEL');

    // IMPORTANTE: Atualiza o objeto na memória para o cálculo de ETA abaixo não usar 0,0
    melhor.latitude = forceLat;
    melhor.longitude = forceLon;
    
    etaFinal = 30; // ETA fixo para fallback
  } else {
    // 2c. Logica normal: filtra por status disponivel
    const disponiveis = candidatos.filter(e => e.status === 'DISPONIVEL' || e.status === '1' || e.status === 1)

    if (disponiveis.length === 0) {
      console.warn('[Módulo Inteligente] Candidatos no radar estão ocupados. Pegando o mais próximo por fallback de simulação.');
      melhor = candidatos[0];
      etaFinal = 60;
    } else {
      const selecionados = disponiveis.slice(0, 5) // 5 mais proximos via redis

      // consulta osrm para eta exato nas ruas
      const candidatosComEta = await Promise.all(
        selecionados.map(async entregador => {
          try {
            const resumo = await roteamentoService.calcularResumo(
              entregador.latitude,
              entregador.longitude,
              restaurante.latitude,
              restaurante.longitude
            )
            return { entregador, eta: resumo.duracao_estimada_segundos }
          } catch (error) {
            return { entregador, eta: Infinity }
          }
        })
      )

      candidatosComEta.sort((a, b) => a.eta - b.eta)
      melhor = candidatosComEta[0].entregador
      etaFinal = candidatosComEta[0].eta
    }
  }

  console.log(`[Módulo Inteligente] Sucesso: Entregador ${melhor.nome} vinculado ao pedido ${pedidoId}.`);

  // 4. cria a entrega no node
  const entrega = await criar({
    pedido_id: pedidoId,
    entregador_id: melhor.id,
    status: 'ATRIBUIDA'
  })

  // 5. atualiza status no c# para ocupado
  if (melhor.status === 'DISPONIVEL' || melhor.status === '1' || melhor.status === 1) {
    try {
      await entregadorService.atualizarStatus(melhor.id, 'EM_ENTREGA')
      console.log(`[gRPC] Status de ${melhor.nome} alterado para EM_ENTREGA`)
    } catch (err) {
      console.error(`[gRPC Erro] Falha ao atualizar status do entregador: ${err.message}`)
    }
  }

  return entrega
}

export const simularDeslocamento = async (entregaId) => {
  if (activeSimulations.has(entregaId)) return true;

  const entrega = await buscarPorId(entregaId);
  if (!entrega) throw new Error('entrega nao encontrada');

  const pedido = await pedidoRepository.buscarPedidoPorId(entrega.pedido_id);
  const motorista = await entregadorService.buscarPorId(entrega.entregador_id);
  
  if (!pedido || !motorista) throw new Error('pedido ou motorista nao encontrado');

  const currentStatus = (entrega.status || "").trim().toUpperCase();
  console.log(`[Simulação] Início para entrega ${entregaId}. Status: ${currentStatus}`);

  // FORÇA status ocupado imediatamente no gRPC
  await entregadorService.atualizarStatus(entrega.entregador_id, 'EM_ENTREGA');

  let destLat = pedido.destino_latitude;
  let destLon = pedido.destino_longitude;

  if (currentStatus === 'ATRIBUIDA') {
    const restaurante = await restauranteRepository.buscarRestaurantePorId(pedido.restaurante_id);
    if (restaurante) {
      destLat = restaurante.latitude;
      destLon = restaurante.longitude;
      console.log(`[Simulação] Destino: Restaurante (${restaurante.nome})`);
    } else {
      console.warn(`[Simulação] ERRO: Restaurante ${pedido.restaurante_id} não encontrado.`);
    }
  } else {
    console.log(`[Simulação] Destino: Cliente`);
  }

  const rota = await obterRotaEstavel(entregaId);
  if (!rota || !rota.caminho || rota.caminho.length === 0) {
    console.error(`[Simulação] Falha crítica: Rota não encontrada para a entrega ${entregaId}`);
    return false;
  }

  const pontos = [...rota.caminho];
  console.log(`[Simulação] Rota carregada: ${pontos.length} pontos disponíveis.`);

  const interval = setInterval(async () => {
    if (pontos.length === 0) {
      clearInterval(interval);
      activeSimulations.delete(entregaId);
      
      if (currentStatus === 'ATRIBUIDA') {
        console.log(`[Simulação] Sucesso: Chegou ao Restaurante. Atualizando para EM_TRANSITO.`);
        await editarPorId(entregaId, { status: 'EM_TRANSITO' });
      } else {
        console.log(`[Simulação] Sucesso: Chegou ao Cliente. Finalizando entrega.`);
        await editarPorId(entregaId, { status: 'ENTREGUE' });
        await entregadorService.atualizarStatus(motorista.id, 'DISPONIVEL');
      }
      return;
    }

    const ponto = pontos.shift();
    try {
      if (pontos.length % 5 === 0) { // loga a cada 5 pontos para nao poluir demais
        console.log(`[Simulação] Motoboy ${motorista.nome} em: ${ponto.latitude.toFixed(5)}, ${ponto.longitude.toFixed(5)} (${pontos.length} restantes)`);
      }
      await entregadorService.atualizarLocalizacao(motorista.id, ponto.latitude, ponto.longitude);
    } catch (e) {
      console.error('erro no deslocamento simulado:', e.message);
    }
  }, 1000);

  activeSimulations.set(entregaId, interval);
  return true;
};

export const obterRotaEstavel = async (entregaId) => {
  const entrega = await buscarPorId(entregaId);
  if (!entrega) return null;

  const currentStatus = (entrega.status || "").trim().toUpperCase();
  const cacheKey = `${entregaId}_${currentStatus}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  for (const key of routeCache.keys()) {
    if (key.startsWith(`${entregaId}_`)) routeCache.delete(key);
  }

  const pedido = await pedidoRepository.buscarPedidoPorId(entrega.pedido_id);
  const motorista = await entregadorService.buscarPorId(entrega.entregador_id);
  
  if (!pedido || !motorista) return null;

  let destLat = pedido.destino_latitude;
  let destLon = pedido.destino_longitude;

  if (currentStatus === 'ATRIBUIDA') {
    const restaurante = await restauranteRepository.buscarRestaurantePorId(pedido.restaurante_id);
    if (restaurante) {
      destLat = restaurante.latitude;
      destLon = restaurante.longitude;
    }
  }

  if (destLat == null || destLon == null) return null;

  try {
    const rota = await roteamentoService.obterGeometria(motorista.latitude, motorista.longitude, destLat, destLon);
    if (rota && rota.caminho && rota.caminho.length > 0) {
      routeCache.set(cacheKey, rota);
    }
    return rota;
  } catch (err) {
    console.error(`[Cache Rota] erro crítico ao calcular:`, err.message);
    return null;
  }
};

export const obterRotaColeta = async (entregaId) => {
  const entrega = await buscarPorId(entregaId);
  if (!entrega) return null;

  const pedido = await pedidoRepository.buscarPedidoPorId(entrega.pedido_id);
  const motorista = await entregadorService.buscarPorId(entrega.entregador_id);
  if (!pedido || !motorista) return null;

  const restaurante = await restauranteRepository.buscarRestaurantePorId(pedido.restaurante_id);
  if (!restaurante) return null;

  try {
    return await roteamentoService.obterGeometria(motorista.latitude, motorista.longitude, restaurante.latitude, restaurante.longitude);
  } catch (err) {
    return null;
  }
};

export const obterRotaEntrega = async (entregaId) => {
  const entrega = await buscarPorId(entregaId);
  if (!entrega) return null;

  const pedido = await pedidoRepository.buscarPedidoPorId(entrega.pedido_id);
  if (!pedido) return null;

  const restaurante = await restauranteRepository.buscarRestaurantePorId(pedido.restaurante_id);
  if (!restaurante) return null;

  try {
    return await roteamentoService.obterGeometria(restaurante.latitude, restaurante.longitude, pedido.destino_latitude, pedido.destino_longitude);
  } catch (err) {
    return null;
  }
};
