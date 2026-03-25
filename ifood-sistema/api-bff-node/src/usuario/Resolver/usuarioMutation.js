import * as usuarioService from '../usuarioService.js'

export const Mutation = {
  criarUsuario: async (_, args) => usuarioService.criar(args),

  editarUsuario: async (_, args) => {
    const { id, ...dados } = args
    return usuarioService.editarPorId(id, dados)
  },

  deletarUsuario: async (_, { id }) => !!(await usuarioService.deletar(id))
}
