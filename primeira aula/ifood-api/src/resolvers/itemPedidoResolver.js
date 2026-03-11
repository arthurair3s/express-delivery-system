import * as itemPedidoService from '../services/itemPedidoService.js'
import * as pedidoService from '../services/pedidoService.js'
import * as produtoService from '../services/produtoService.js'

export const itemPedidoResolver = {
  Query: {
    itensPedido: async () => itemPedidoService.listar(),
    itemPedido: async (_, { id }) => itemPedidoService.buscarPorId(id)
  },

  Mutation: {
    criarItemPedido: async (_, args) => itemPedidoService.criar(args),

    editarItemPedido: async (_, args) => {
      const { id, ...dados } = args
      return itemPedidoService.editarPorId(id, dados)
    },

    deletarItemPedido: async (_, { id }) => !!(await itemPedidoService.deletar(id))
  },

  ItemPedido: {
    pedido: async parent => {
      return pedidoService.buscarPorId(parent.pedido_id)
    },

    produto: async parent => {
      return produtoService.buscarPorId(parent.produto_id)
    }
  }
}
