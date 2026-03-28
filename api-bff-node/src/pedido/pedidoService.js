import * as pedidoRepository from './pedidoRepository.js'

export const listar = async () => {
  return pedidoRepository.listarPedidos()
}

export const buscarPorId = async id => {
  return pedidoRepository.buscarPedidoPorId(id)
}

export const criar = async dados => {
  return pedidoRepository.criarPedido(dados)
}

export const editarPorId = async (id, dados) => {
  return pedidoRepository.editarPedidoPorId(id, dados)
}

export const deletar = async id => {
  return pedidoRepository.deletarPedido(id)
}