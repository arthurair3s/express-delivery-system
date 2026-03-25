import { Query } from './itemPedidoQuery.js'
import { Mutation } from './itemPedidoMutation.js'
import * as pedidoService from '../../pedido/pedidoService.js'
import * as produtoService from '../../produto/produtoService.js'

export const itemPedidoResolver = {
  Query,
  Mutation,
  ItemPedido: {
    pedido: async parent => {
      return pedidoService.buscarPorId(parent.pedido_id)
    },
    produto: async parent => {
      return produtoService.buscarPorId(parent.produto_id)
    }
  }
}
