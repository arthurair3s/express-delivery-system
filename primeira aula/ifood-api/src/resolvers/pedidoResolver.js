import * as pedidoService from '../services/pedidoService.js'
import { buscarPorId } from '../services/usuarioService.js'
import * as itemPedidoService from '../services/itemPedidoService.js'

export const pedidoResolver = {
  Query: {
    pedidos: async () => pedidoService.listar(),
    pedido: async (_, { id }) => pedidoService.buscarPorId(id)
  },

  Mutation: {
    criarPedido: async (_, args) => pedidoService.criar(args),

    editarPedido: async (_, args) => {
      const { id, ...dados } = args
      return pedidoService.editarPorId(id, dados)
    },

    deletarPedido: async (_, { id }) => !!(await pedidoService.deletar(id))
  },

  Pedido: {
    usuario: async parent => {
      return buscarPorId(parent.usuario_id)
    },
    itensPedido: async parent => {
      return itemPedidoService.buscarItensPorPedidoId(parent.id)
    }
  }
}
