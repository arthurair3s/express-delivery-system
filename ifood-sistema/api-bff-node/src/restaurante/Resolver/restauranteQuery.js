import * as restauranteService from '../restauranteService.js'

export const Query = {
  restaurantes: async () => restauranteService.listar(),
  restaurante: async (_, { id }) => restauranteService.buscarPorId(id)
}
