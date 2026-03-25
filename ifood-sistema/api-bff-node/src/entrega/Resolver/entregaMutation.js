import * as entregaService from '../entregaService.js'

export const Mutation = {
  criarEntrega: async (_, args) => entregaService.criar(args),

  editarEntrega: async (_, args) => {
    const { id, ...dados } = args
    return entregaService.editarPorId(id, dados)
  },

  deletarEntrega: async (_, { id }) => !!(await entregaService.deletar(id))
}
