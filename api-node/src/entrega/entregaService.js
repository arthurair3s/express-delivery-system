import * as entregaRepository from './entregaRepository.js'

export const listar = async () => {
  return entregaRepository.listarEntregas()
}

export const buscarPorId = async id => {
  return entregaRepository.buscarEntregaPorId(id)
}

export const criar = async entrega => {
  return entregaRepository.criarEntrega(entrega)
}

export const editarPorId = async (id, entrega) => {
  return entregaRepository.editarEntregaPorId(id, entrega)
}

export const deletar = async id => {
  return entregaRepository.deletarEntrega(id)
}
