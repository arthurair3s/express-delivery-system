import { Query } from './entregaQuery.js'
import { Mutation } from './entregaMutation.js'
import * as pedidoService from '../../pedido/pedidoService.js'
import * as entregadorService from '../../entregador/entregadorService.js'

export const entregaResolver = {
  Query,
  Mutation,
  Entrega: {
    pedido: async parent => {
      if (!parent.pedido_id) return null
      return pedidoService.buscarPorId(parent.pedido_id)
    },
    entregador: async parent => {
      if (!parent.entregador_id) return null
      return entregadorService.buscarPorId(parent.entregador_id)
    }
  }
}
