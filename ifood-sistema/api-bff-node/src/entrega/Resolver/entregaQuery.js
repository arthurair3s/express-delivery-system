import * as entregaService from '../entregaService.js'

export const Query = {
  entregas: async () => entregaService.listar(),
  entrega: async (_, { id }) => entregaService.buscarPorId(id)
}
