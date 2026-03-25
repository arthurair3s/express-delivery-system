import * as avaliacaoService from '../avaliacaoService.js'

export const Query = {
  avaliacoes: async () => avaliacaoService.listar(),
  avaliacao: async (_, { id }) => avaliacaoService.buscarPorId(id)
}
