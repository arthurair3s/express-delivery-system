import * as avaliacaoService from '../avaliacaoService.js'

export const Mutation = {
  criarAvaliacao: async (_, args) => avaliacaoService.criar(args),

  editarAvaliacao: async (_, args) => {
    const { id, ...dados } = args
    return avaliacaoService.editarPorId(id, dados)
  },

  deletarAvaliacao: async (_, { id }) => !!(await avaliacaoService.deletar(id))
}
