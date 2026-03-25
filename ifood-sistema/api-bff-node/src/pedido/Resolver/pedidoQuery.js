import * as pedidoService from '../pedidoService.js'

export const Query = {
  pedidos: async () => pedidoService.listar(),
  pedido: async (_, { id }) => pedidoService.buscarPorId(id)
}
