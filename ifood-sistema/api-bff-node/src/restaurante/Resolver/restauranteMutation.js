import * as restauranteService from '../restauranteService.js'

export const Mutation = {
  criarRestaurante: async (_, args) => restauranteService.criar(args),

  editarRestaurante: async (_, args) => {
    const { id, ...dados } = args
    return restauranteService.editarPorId(id, dados)
  },

  deletarRestaurante: async (_, { id }) => !!(await restauranteService.deletar(id))
}
