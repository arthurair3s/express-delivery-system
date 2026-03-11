import * as restauranteService from '../services/restauranteService.js'

export const restauranteResolver = {
  Query: {
    restaurantes: async () => restauranteService.listar(),
    restaurante: async (_, { id }) => restauranteService.buscarPorId(id)
  },

  Mutation: {
    criarRestaurante: async (_, args) => restauranteService.criar(args),

    editarRestaurante: async (_, args) => {
      const { id, ...dados } = args
      return restauranteService.editarPorId(id, dados)
    },

    deletarRestaurante: async (_, { id }) => !!(await restauranteService.deletar(id))
  }
}
