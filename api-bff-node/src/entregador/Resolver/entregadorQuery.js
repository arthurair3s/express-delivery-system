import * as entregadorService from '../entregadorService.js'

export const Query = {
  entregadores: async () => {
    const response = await entregadorService.listar()
    return response || []
  },

  entregador: async (_, { id }) => entregadorService.buscarPorId(id),

  buscarEntregadoresProximos: async (_, { latitude, longitude, raioKm }) => {
    const result = await entregadorService.listarProximos(
      latitude,
      longitude,
      raioKm
    )

    return result || []
  },

  entregadoresProximosAoRestaurante: async (_, { restauranteId, raioKm }) =>
    entregadorService.listarProximosAoRestaurante(restauranteId, raioKm)
}
