import * as itemPedidoRepository from './itemPedidoRepository.js'

export const listar = async () => {
  return itemPedidoRepository.listarItensPedido()
}

export const buscarPorId = async id => {
  return itemPedidoRepository.buscarItemPedidoPorId(id)
}

export const criar = async dados => {
  return itemPedidoRepository.criarItemPedido(dados)
}

export const editarPorId = async (id, dados) => {
  return itemPedidoRepository.editarItemPedidoPorId(id, dados)
}

export const deletar = async id => {
  return itemPedidoRepository.deletarItemPedido(id)
}

export const buscarItensPorPedidoId = async pedido_id => {
  return itemPedidoRepository.buscarItensPorPedidoId(pedido_id)
}