import { Query } from './categoriaQuery.js'
import { Mutation } from './categoriaMutation.js'
import * as restauranteService from '../../restaurante/restauranteService.js'

export const categoriaResolver = {
  Query,
  Mutation,
  Categoria: {
    restaurante: async parent => {
      if (!parent.restaurante_id) return null
      return restauranteService.buscarPorId(parent.restaurante_id)
    }
  }
}
