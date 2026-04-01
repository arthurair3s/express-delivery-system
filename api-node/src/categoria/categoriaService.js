import * as categoriaRepository from './categoriaRepository.js'

export const listar = async () => {
  return categoriaRepository.listarCategorias()
}

export const buscarPorId = async id => {
  return categoriaRepository.buscarCategoriaPorId(id)
}

export const criar = async categoria => {
  return categoriaRepository.criarCategoria(categoria)
}

export const editarPorId = async (id, categoria) => {
  return categoriaRepository.editarCategoriaPorId(id, categoria)
}

export const deletar = async id => {
  return categoriaRepository.deletarCategoria(id)
}
