import * as categoriaService from '../categoriaService.js'

export const Query = {
  categorias: async () => categoriaService.listar(),
  categoria: async (_, { id }) => categoriaService.buscarPorId(id)
}
