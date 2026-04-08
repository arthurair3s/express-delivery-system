import { Query } from './restauranteQuery.js'
import { Mutation } from './restauranteMutation.js'

export const restauranteResolver = {
  Query,
  Mutation,
  Restaurante: {
    categorias: async (parent) => {
      // Import inline or dynamic to avoid circular dependencies if any
      const categoriaService = await import('../../categoria/categoriaService.js');
      return categoriaService.buscarPorRestaurante(parent.id);
    }
  }
}
