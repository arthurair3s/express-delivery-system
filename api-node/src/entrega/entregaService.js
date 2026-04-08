import * as entregaRepository from './entregaRepository.js'
import * as pedidoRepository from '../pedido/pedidoRepository.js'
import * as restauranteRepository from '../restaurante/restauranteRepository.js'
import * as entregadorService from '../entregador/entregadorService.js'
import * as roteamentoService from '../roteamento/roteamentoService.js'

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

  // 1. Busca entregadores próximos (5km) chamando o gRPC C# (Entregadores)
  const candidatos = await entregadorService.listarProximosAoRestaurante(restaurante.id, 5.0)
  if (!candidatos || candidatos.length === 0) {
    throw new Error('Nenhum entregador disponível no raio de 5km.')
  }

  let melhor = null
  let etaFinal = 0

  // 2. Lógica de Batching: prioriza entregar 2 pedidos pra mesma pessoa se ela já estiver na loja
  const ocupados = candidatos.filter(e => e.status === 'EM_ENTREGA' || e.status === 2 || e.status === '2')
  for (const motociclista of ocupados) {
    const estaNaLoja = await entregaRepository.possuiEntregaAtivaNoRestaurante(motociclista.id, restaurante.id)
    if (estaNaLoja) {
      melhor = motociclista
      console.log(`[Módulo Inteligente] BATCHING APROVADO! O(a) Entregador(a) ${motociclista.nome} levará este pedido como adicional.`)
      break
    }
  }

  // 3. Lógica de Rota (ETA real) se nenhum Batching for encontrado
  if (!melhor) {
    const disponiveis = candidatos.filter(e => e.status === 'DISPONIVEL' || e.status === '1' || e.status === 1)

    if (disponiveis.length === 0) {
      throw new Error('Nenhum entregador disponível no momento (todos ocupados e sem batch).')
    }

    const selecionados = disponiveis.slice(0, 5) // Pegamos os 5 mais próximos via Redis (raio)

    // Consultar o gRPC Python/OSRM para ter o ETA exato pelas ruas
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
          console.error(`Erro ao calcular rota para entregador ${entregador.id}:`, error.message)
          return { entregador, eta: Infinity }
        }
      })
    )

    candidatosComEta.sort((a, b) => a.eta - b.eta)
    melhor = candidatosComEta[0].entregador
    etaFinal = candidatosComEta[0].eta

    console.log(`[Módulo Inteligente] Entregador Livre ${melhor.nome} (ID: ${melhor.id}) selecionado com ETA de ${etaFinal}s.`)
  }

  // 4. Cria a Entrega real no Node.js
  const entrega = await criar({
    pedido_id: pedidoId,
    entregador_id: melhor.id,
    status: 'ATRIBUIDA'
  })

  // 5. Atualiza o status do entregador no microsserviço C# pra não pegar outra corrida aleatória
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
