import * as pagamentoService from '../services/pagamentoService.js'
import * as pedidoService from '../services/pedidoService.js'

export const pagamentoResolver = {
  Query: {
    pagamentos: async () => pagamentoService.listar(),
    pagamento: async (_, { id }) => pagamentoService.buscarPorId(id)
  },

  Mutation: {
    criarPagamento: async (_, args) => pagamentoService.criar(args),

    editarPagamento: async (_, args) => {
      const { id, ...dados } = args
      return pagamentoService.editarPorId(id, dados)
    },

    deletarPagamento: async (_, { id }) => !!(await pagamentoService.deletar(id))
  },

  Pagamento: {
    pedido: async parent => {
      if (!parent.pedido_id) return null
      return pedidoService.buscarPorId(parent.pedido_id)
    }
  }
}
