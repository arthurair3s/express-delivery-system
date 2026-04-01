import * as usuarioRepository from './usuarioRepository.js'

export const listar = async () => {
  return usuarioRepository.listarUsuarios()
}

export const buscarPorId = async id => {
  return usuarioRepository.buscarUsuarioPorId(id)
}

export const criar = async dados => {
  return usuarioRepository.criarUsuario(dados)
}

export const editarPorId = async (id, dados) => {
  return usuarioRepository.editarUsuarioPorId(id, dados)
}

export const deletar = async id => {
  return usuarioRepository.deletarUsuario(id)
}
