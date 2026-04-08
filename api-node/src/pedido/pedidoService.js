import * as pedidoRepository from './pedidoRepository.js'
import * as entregaService from '../entrega/entregaService.js'

export const listar = async () => {
  return pedidoRepository.listarPedidos()
}

export const buscarPorId = async id => {
  return pedidoRepository.buscarPedidoPorId(id)
}

export const criar = async dados => {
  // O Pedido nasce com este status padrão na nossa integração
  const novoPedido = await pedidoRepository.criarPedido({
    ...dados,
    status: 'EM_PREPARO_ENTREGA' 
  });

  // Dispara a lógica de atribuição inteligente (pode ser Async em PRD, faremos Sync para logs)
  try {
    await entregaService.atribuirMelhorEntregador(novoPedido.id);
  } catch (error) {
    console.error(`[Módulo Inteligente] Falhas ao orquestrar a entrega do pedido ${novoPedido.id}:`, error.message);
  }

  return novoPedido;
}

export const editarPorId = async (id, dados) => {
  return pedidoRepository.editarPedidoPorId(id, dados)
}

export const deletar = async id => {
  return pedidoRepository.deletarPedido(id)
}

export const buscarPorUsuarioId = async id => {
  return pedidoRepository.buscarPedidoPorUsuarioId(id)
}