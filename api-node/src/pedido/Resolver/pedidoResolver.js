import { Query } from './pedidoQuery.js'
import { Mutation } from './pedidoMutation.js'
import { buscarPorId } from '../../usuario/usuarioService.js'
import * as itemPedidoService from '../../itemPedido/itemPedidoService.js'
import * as entregaService from '../../entrega/entregaService.js'

export const pedidoResolver = {
  Query,
  Mutation,
  Pedido: {
    usuario: async parent => {
      return buscarPorId(parent.usuario_id)
    },
    itensPedido: async parent => {
      return itemPedidoService.buscarItensPorPedidoId(parent.id)
    },
    entregas: async parent => {
      return entregaService.buscarPorPedidoId(parent.id)
    }
  }
}
