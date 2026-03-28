import * as produtoRepository from './produtoRepository.js'

export const listar = async () => {
  return produtoRepository.listarProdutos()
}

export const buscarPorId = async id => {
  return produtoRepository.buscarProdutoPorId(id)
}

export const criar = async dados => {
  return produtoRepository.criarProduto(dados)
}

export const editarPorId = async (id, dados) => {
  return produtoRepository.editarProdutoPorId(id, dados)
}

export const deletar = async id => {
  return produtoRepository.deletarProduto(id)
}