import { Query } from './categoriaQuery.js'
import { Mutation } from './categoriaMutation.js'
import * as restauranteService from '../../restaurante/restauranteService.js'
import * as produtoService from '../../produto/produtoService.js'

export const categoriaResolver = {
  Query,
  Mutation,
  Categoria: {
    restaurante: async parent => {
      if (!parent.restaurante_id) return null
      return restauranteService.buscarPorId(parent.restaurante_id)
    },
    produtos: async parent => {
      if (!parent.id) return []
      return produtoService.buscarPorCategoria(parent.id)
    }
  }
}
