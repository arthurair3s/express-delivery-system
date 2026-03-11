import * as avaliacaoService from '../services/avaliacaoService.js'
import * as usuarioService from '../services/usuarioService.js'
import * as restauranteService from '../services/restauranteService.js'

export const avaliacaoResolver = {
  Query: {
    avaliacoes: async () => avaliacaoService.listar(),
    avaliacao: async (_, { id }) => avaliacaoService.buscarPorId(id)
  },

  Mutation: {
    criarAvaliacao: async (_, args) => avaliacaoService.criar(args),

    editarAvaliacao: async (_, args) => {
      const { id, ...dados } = args
      return avaliacaoService.editarPorId(id, dados)
    },

    deletarAvaliacao: async (_, { id }) => !!(await avaliacaoService.deletar(id))
  },

  Avaliacao: {
    usuario: async parent => {
      if (!parent.usuario_id) return null
      return usuarioService.buscarPorId(parent.usuario_id)
    },
    restaurante: async parent => {
      if (!parent.restaurante_id) return null
      return restauranteService.buscarPorId(parent.restaurante_id)
    }
  }
}
