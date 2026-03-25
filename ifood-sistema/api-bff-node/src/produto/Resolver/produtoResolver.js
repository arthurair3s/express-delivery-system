import { Query } from './produtoQuery.js'
import { Mutation } from './produtoMutation.js'
import * as categoriaService from '../../categoria/categoriaService.js'

export const produtoResolver = {
  Query,
  Mutation,
  Produto: {
    categoria: async parent => {
      if (!parent.categoria_id) return null
      return categoriaService.buscarPorId(parent.categoria_id)
    }
  }
}
