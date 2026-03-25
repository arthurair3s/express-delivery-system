import * as categoriaService from '../categoriaService.js'

export const Mutation = {
  criarCategoria: async (_, args) => categoriaService.criar(args),

  editarCategoria: async (_, args) => {
    const { id, ...dados } = args
    return categoriaService.editarPorId(id, dados)
  },

  deletarCategoria: async (_, { id }) => !!(await categoriaService.deletar(id))
}
