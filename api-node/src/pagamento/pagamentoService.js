import * as pagamentoRepository from './pagamentoRepository.js'

export const listar = async () => {
  return pagamentoRepository.listarPagamentos()
}

export const buscarPorId = async id => {
  return pagamentoRepository.buscarPagamentoPorId(id)
}

export const criar = async pagamento => {
  return pagamentoRepository.criarPagamento(pagamento)
}

export const editarPorId = async (id, pagamento) => {
  return pagamentoRepository.editarPagamentoPorId(id, pagamento)
}

export const deletar = async id => {
  return pagamentoRepository.deletarPagamento(id)
}
