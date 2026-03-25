import * as itemPedidoService from '../itemPedidoService.js'

export const Mutation = {
  criarItemPedido: async (_, args) => itemPedidoService.criar(args),

  editarItemPedido: async (_, args) => {
    const { id, ...dados } = args
    return itemPedidoService.editarPorId(id, dados)
  },

  deletarItemPedido: async (_, { id }) => !!(await itemPedidoService.deletar(id))
}
