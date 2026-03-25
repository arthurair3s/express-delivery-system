import * as pagamentoService from '../pagamentoService.js'

export const Mutation = {
  criarPagamento: async (_, args) => pagamentoService.criar(args),

  editarPagamento: async (_, args) => {
    const { id, ...dados } = args
    return pagamentoService.editarPorId(id, dados)
  },

  deletarPagamento: async (_, { id }) => !!(await pagamentoService.deletar(id))
}
