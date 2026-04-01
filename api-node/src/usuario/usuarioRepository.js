import { prisma } from '../database/connection.js'

export const listarUsuarios = async () => {
  return await prisma.usuarios.findMany()
}

export const buscarUsuarioPorId = async id => {
  return await prisma.usuarios.findUnique({
    where: { id: Number(id) }
  })
}

export const criarUsuario = async usuario => {
  const { nome, email, telefone, senha } = usuario
  return await prisma.usuarios.create({
    data: { nome, email, telefone, senha }
  })
}

export const editarUsuarioPorId = async (id, usuario) => {
  const { nome, email, telefone, senha } = usuario
  return await prisma.usuarios.update({
    where: { id: Number(id) },
    data: {
      nome: nome || undefined,
      email: email || undefined,
      telefone: telefone || undefined,
      senha: senha || undefined
    }
  })
}

export const deletarUsuario = async id => {
  return await prisma.usuarios.delete({
    where: { id: Number(id) }
  })
}
