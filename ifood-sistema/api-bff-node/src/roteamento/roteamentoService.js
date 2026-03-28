import roteamentoClient from '../grpc/roteamentoClient.js'

export const calcularResumo = (
  origemLat,
  origemLon,
  destinoLat,
  destinoLon
) => {
  return new Promise((resolve, reject) => {
    roteamentoClient.CalcularResumoRota(
      {
        origem: { latitude: origemLat, longitude: origemLon },
        destino: { latitude: destinoLat, longitude: destinoLon }
      },
      (error, response) => {
        if (error) return reject(error)
        resolve(response)
      }
    )
  })
}

export const obterGeometria = (
  origemLat,
  origemLon,
  destinoLat,
  destinoLon
) => {
  return new Promise((resolve, reject) => {
    roteamentoClient.ObterGeometriaRota(
      {
        origem: { latitude: origemLat, longitude: origemLon },
        destino: { latitude: destinoLat, longitude: destinoLon }
      },
      (error, response) => {
        if (error) return reject(error)
        resolve(response)
      }
    )
  })
}

export const calcularMultiplosPontos = pontos => {
  return new Promise((resolve, reject) => {
    roteamentoClient.CalcularRotaMultiplosPontos(
      { pontos },
      (error, response) => {
        if (error) return reject(error)
        resolve(response)
      }
    )
  })
}
