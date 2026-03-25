import * as entregadorService from '../entregadorService.js'

export const Query = {
  entregadores: async () => entregadorService.listar(),
  entregador: async (_, { id }) => entregadorService.buscarPorId(id),
  buscarEntregadoresProximos: async (_, { latitude, longitude, raioKm }) =>
    entregadorService.listarProximos(latitude, longitude, raioKm)
}
