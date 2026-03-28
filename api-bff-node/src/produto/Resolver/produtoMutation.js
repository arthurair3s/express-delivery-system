import * as produtoService from '../produtoService.js'

export const Mutation = {
  criarProduto: async (_, args) => produtoService.criar(args),

  editarProduto: async (_, args) => {
    const { id, ...dados } = args
    return produtoService.editarPorId(id, dados)
  },

  deletarProduto: async (_, { id }) => !!(await produtoService.deletar(id))
}
