import * as entregadorService from '../services/entregadorService.js'

export const entregadorResolver = {
  Query: {
    entregadores: async () => entregadorService.listar(),
    entregador: async (_, { id }) => entregadorService.buscarPorId(id)
  },

  Mutation: {
    criarEntregador: async (_, args) => entregadorService.criar(args),

    editarEntregador: async (_, args) => {
      const { id, ...dados } = args
      return entregadorService.editarPorId(id, dados)
    },

    deletarEntregador: async (_, { id }) => !!(await entregadorService.deletar(id))
  }
}
