import { Query } from './pagamentoQuery.js'
import { Mutation } from './pagamentoMutation.js'
import * as pedidoService from '../../pedido/pedidoService.js'

export const pagamentoResolver = {
  Query,
  Mutation,
  Pagamento: {
    pedido: async parent => {
      if (!parent.pedido_id) return null
      return pedidoService.buscarPorId(parent.pedido_id)
    }
  }
}
