import * as produtoService from '../produtoService.js'

export const Query = {
  produtos: async () => produtoService.listar(),
  produto: async (_, { id }) => produtoService.buscarPorId(id)
}
