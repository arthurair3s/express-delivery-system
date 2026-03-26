import * as restauranteService from '../restaurante/restauranteService.js'
import client from './grpcClient.js'

export const criar = dados => {
  return new Promise((resolve, reject) => {
    client.CadastrarEntregador(dados, (error, response) => {
      if (error) return reject(error)
      resolve(response)
    })
  })
}

export const listarProximos = (latitude, longitude, raioKm) => {
  return new Promise((resolve, reject) => {
    client.BuscarProximos(
      { latitude, longitude, raio_km: raioKm },
      (error, response) => {
        if (error) return reject(error)
        resolve(response.entregadores || [])
      }
    )
  })
}

export const listarProximosAoRestaurante = async (restauranteId, raioKm) => {
  const restaurante = await restauranteService.buscarPorId(restauranteId)

  if (!restaurante || !restaurante.latitude || !restaurante.longitude) {
    throw new Error(
      'Restaurante não encontrado ou sem coordenadas geográficas.'
    )
  }

  return new Promise((resolve, reject) => {
    client.BuscarProximos(
      {
        latitude: restaurante.latitude,
        longitude: restaurante.longitude,
        raio_km: raioKm
      },
      (error, response) => {
        if (error) return reject(error)
        resolve(response.entregadores || [])
      }
    )
  })
}

export const buscarPorId = id => {
  return new Promise((resolve, reject) => {
    client.ObterEntregadorPorId({ id: parseInt(id) }, (error, response) => {
      if (error) return reject(error)
      resolve(response)
    })
  })
}

export const editarPorId = (id, dados) => {
  return new Promise((resolve, reject) => {
    client.EditarEntregador(
      { id: parseInt(id), ...dados },
      (error, response) => {
        if (error) return reject(error)
        resolve(response)
      }
    )
  })
}

export const deletar = id => {
  return new Promise((resolve, reject) => {
    client.DeletarEntregador({ id: parseInt(id) }, (error, response) => {
      if (error) return reject(error)
      resolve(response.sucesso)
    })
  })
}

export const listar = () => {
  return new Promise((resolve, reject) => {
    client.ListarTodosEntregadores({}, (error, response) => {
      if (error) return reject(error)
      resolve(response.entregadores || [])
    })
  })
}
