import * as restauranteRepository from './restauranteRepository.js'

export const listar = async () => {
  return restauranteRepository.listarRestaurantes()
}

export const buscarPorId = async id => {
  return restauranteRepository.buscarRestaurantePorId(id)
}

export const criar = async dados => {
  return restauranteRepository.criarRestaurante(dados)
}

export const editarPorId = async (id, dados) => {
  return restauranteRepository.editarRestaurantePorId(id, dados)
}

export const deletar = async id => {
  return restauranteRepository.deletarRestaurante(id)
}