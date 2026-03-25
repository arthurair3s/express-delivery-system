import { Query } from './avaliacaoQuery.js'
import { Mutation } from './avaliacaoMutation.js'
import * as usuarioService from '../../usuario/usuarioService.js'
import * as restauranteService from '../../restaurante/restauranteService.js'

export const avaliacaoResolver = {
  Query,
  Mutation,
  Avaliacao: {
    usuario: async parent => {
      if (!parent.usuario_id) return null
      return usuarioService.buscarPorId(parent.usuario_id)
    },
    restaurante: async parent => {
      if (!parent.restaurante_id) return null
      return restauranteService.buscarPorId(parent.restaurante_id)
    }
  }
}
