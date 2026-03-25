import client from './grpcClient.js'

export const criar = args => {
  return new Promise((resolve, reject) => {
    client.CadastrarEntregador(args, (error, response) => {
      if (error) return reject(error)
      resolve(response)
    })
  })
}

export const listarProximos = (latitude, longitude, raioKm) => {
  return new Promise((resolve, reject) => {
    client.BuscarProximos(
      { latitude, longitude, raioKm },
      (error, response) => {
        if (error) return reject(error)
        resolve(response.entregadores)
      }
    )
  })
}

// --- TODO ---

export const buscarPorId = id => {
  console.log(`[TODO] Buscar entregador ${id} via gRPC`)
  return null
}

export const editarPorId = (id, dados) => {
  console.log(`[TODO] Editar entregador ${id} via gRPC`)
  return null
}

export const deletar = id => {
  console.log(`[TODO] Deletar entregador ${id} via gRPC`)
  return false
}

export const listar = () => {
  console.log(`[TODO] Listar todos via gRPC`)
  return []
}
