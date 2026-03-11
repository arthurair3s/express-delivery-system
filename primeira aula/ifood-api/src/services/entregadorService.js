import * as entregadorRepository from '../repository/entregadorRepository.js'

export const listar = async () => {
  return entregadorRepository.listarEntregadores()
}

export const buscarPorId = async id => {
  return entregadorRepository.buscarEntregadorPorId(id)
}

export const criar = async entregador => {
  return entregadorRepository.criarEntregador(entregador)
}

export const editarPorId = async (id, entregador) => {
  return entregadorRepository.editarEntregadorPorId(id, entregador)
}

export const deletar = async id => {
  return entregadorRepository.deletarEntregador(id)
}
