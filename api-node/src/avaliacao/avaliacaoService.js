import * as avaliacaoRepository from './avaliacaoRepository.js'

export const listar = async () => {
  return avaliacaoRepository.listarAvaliacoes()
}

export const buscarPorId = async id => {
  return avaliacaoRepository.buscarAvaliacaoPorId(id)
}

export const criar = async avaliacao => {
  return avaliacaoRepository.criarAvaliacao(avaliacao)
}

export const editarPorId = async (id, avaliacao) => {
  return avaliacaoRepository.editarAvaliacaoPorId(id, avaliacao)
}

export const deletar = async id => {
  return avaliacaoRepository.deletarAvaliacao(id)
}
