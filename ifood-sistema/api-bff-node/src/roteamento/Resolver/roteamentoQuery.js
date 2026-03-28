import * as roteamentoService from '../roteamentoService.js'

export const Query = {
  calcularResumoRota: async (
    _,
    { origemLat, origemLon, destinoLat, destinoLon }
  ) => {
    return roteamentoService.calcularResumo(
      origemLat,
      origemLon,
      destinoLat,
      destinoLon
    )
  },

  obterGeometriaRota: async (
    _,
    { origemLat, origemLon, destinoLat, destinoLon }
  ) => {
    return roteamentoService.obterGeometria(
      origemLat,
      origemLon,
      destinoLat,
      destinoLon
    )
  },

  calcularRotaMultiplosPontos: async (_, { pontos }) => {
    return roteamentoService.calcularMultiplosPontos(pontos)
  }
}
