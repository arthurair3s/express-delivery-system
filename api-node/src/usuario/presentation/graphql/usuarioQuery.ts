import type { IUsuarioService } from '../../application/ports/IUsuarioService.js'

export const createUsuarioQuery = (service: IUsuarioService) => ({
  // A autenticação é garantida pela diretiva @auth no schema.
  me: async (_: any, __: any, context: any) => service.buscarPorId(context.user.id)
})
