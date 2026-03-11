import * as produtoService from '../services/produtoService.js'
import * as categoriaService from '../services/categoriaService.js'

export const produtoResolver = {
  Query: {
    produtos: async () => produtoService.listar(),
    produto: async (_, { id }) => produtoService.buscarPorId(id)
  },

  Mutation: {
    criarProduto: async (_, args) => produtoService.criar(args),

    editarProduto: async (_, args) => {
      const { id, ...dados } = args
      return produtoService.editarPorId(id, dados)
    },

    deletarProduto: async (_, { id }) => !!(await produtoService.deletar(id))
  },

  Produto: {
    categoria: async parent => {
      if (!parent.categoria_id) return null
      return categoriaService.buscarPorId(parent.categoria_id)
    }
  }
}
