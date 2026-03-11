import * as entregaService from '../services/entregaService.js'
import * as pedidoService from '../services/pedidoService.js'
import * as entregadorService from '../services/entregadorService.js'

export const entregaResolver = {
  Query: {
    entregas: async () => entregaService.listar(),
    entrega: async (_, { id }) => entregaService.buscarPorId(id)
  },

  Mutation: {
    criarEntrega: async (_, args) => entregaService.criar(args),

    editarEntrega: async (_, args) => {
      const { id, ...dados } = args
      return entregaService.editarPorId(id, dados)
    },

    deletarEntrega: async (_, { id }) => !!(await entregaService.deletar(id))
  },

  Entrega: {
    pedido: async parent => {
      if (!parent.pedido_id) return null
      return pedidoService.buscarPorId(parent.pedido_id)
    },
    entregador: async parent => {
      if (!parent.entregador_id) return null
      return entregadorService.buscarPorId(parent.entregador_id)
    }
  }
}
