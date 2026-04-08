import { Query } from './usuarioQuery.js'
import { Mutation } from './usuarioMutation.js'
import * as pedidoService from '../../pedido/pedidoService.js'

export const usuarioResolver = {
  Query,
  Mutation,
  Usuario: {
    pedidos: async parent => {
      return pedidoService.buscarPorUsuarioId(parent.id)
    }
  }
}
