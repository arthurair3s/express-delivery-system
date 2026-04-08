import * as pedidoService from '../pedidoService.js'

export const Mutation = {
  criarPedido: async (_, args) => pedidoService.criar(args),

  editarPedido: async (_, args) => {
    const { id, ...dados } = args
    return pedidoService.editarPorId(id, dados)
  },

  deletarPedido: async (_, { id }) => !!(await pedidoService.deletar(id))
}
