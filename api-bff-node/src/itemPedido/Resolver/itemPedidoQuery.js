import * as itemPedidoService from '../itemPedidoService.js'

export const Query = {
  itensPedido: async () => itemPedidoService.listar(),
  itemPedido: async (_, { id }) => itemPedidoService.buscarPorId(id)
}
