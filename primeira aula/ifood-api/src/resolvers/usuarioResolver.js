import * as usuarioService from '../services/usuarioService.js'

export const usuarioResolver = {
  Query: {
    usuarios: async () => usuarioService.listar(),
    usuario: async (_, { id }) => usuarioService.buscarPorId(id)
  },

  Mutation: {
    criarUsuario: async (_, args) => usuarioService.criar(args),

    editarUsuario: async (_, args) => {
      const { id, ...dados } = args
      return usuarioService.editarPorId(id, dados)
    },

    deletarUsuario: async (_, { id }) => !!(await usuarioService.deletar(id))
  }
}
