import * as entregadorService from '../entregadorService.js'

export const Mutation = {
  criarEntregador: async (_, args) => entregadorService.criar(args),

  editarEntregador: async (_, args) => {
    const { id, ...dados } = args
    return entregadorService.editarPorId(id, dados)
  },

  deletarEntregador: async (_, { id }) => !!(await entregadorService.deletar(id))
}
