import { Query } from './entregadorQuery.js'
import { Mutation } from './entregadorMutation.js'
import * as entregaService from '../../entrega/entregaService.js'

export const entregadorResolver = {
  Query,
  Mutation,
  Entregador: {
    entregas: async parent => {
      return entregaService.buscarPorEntregadorId(parent.id)
    }
  }
}
