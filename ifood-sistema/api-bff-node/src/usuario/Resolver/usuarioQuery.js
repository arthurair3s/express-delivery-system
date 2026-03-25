import * as usuarioService from '../usuarioService.js'

export const Query = {
  usuarios: async () => usuarioService.listar(),
  usuario: async (_, { id }) => usuarioService.buscarPorId(id)
}
