import * as categoriaService from '../services/categoriaService.js'
import * as restauranteService from '../services/restauranteService.js'

export const categoriaResolver = {
  Query: {
    categorias: async () => categoriaService.listar(),
    categoria: async (_, { id }) => categoriaService.buscarPorId(id)
  },

  Mutation: {
    criarCategoria: async (_, args) => categoriaService.criar(args),

    editarCategoria: async (_, args) => {
      const { id, ...dados } = args
      return categoriaService.editarPorId(id, dados)
    },

    deletarCategoria: async (_, { id }) => !!(await categoriaService.deletar(id))
  },

  Categoria: {
    restaurante: async parent => {
      if (!parent.restaurante_id) return null
      return restauranteService.buscarPorId(parent.restaurante_id)
    }
  }
}
