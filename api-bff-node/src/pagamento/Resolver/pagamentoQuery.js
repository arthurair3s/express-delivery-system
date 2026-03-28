import * as pagamentoService from '../pagamentoService.js'

export const Query = {
  pagamentos: async () => pagamentoService.listar(),
  pagamento: async (_, { id }) => pagamentoService.buscarPorId(id)
}
