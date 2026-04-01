import { prisma } from '../database/connection.js'

export const listarAvaliacoes = async () => {
  return await prisma.avaliacoes.findMany()
}

export const buscarAvaliacaoPorId = async id => {
  return await prisma.avaliacoes.findUnique({
    where: { id: Number(id) }
  })
}

export const criarAvaliacao = async avaliacao => {
  const { usuario_id, restaurante_id, nota, comentario } = avaliacao
  return await prisma.avaliacoes.create({
    data: {
      usuario_id: usuario_id ? Number(usuario_id) : undefined,
      restaurante_id: restaurante_id ? Number(restaurante_id) : undefined,
      nota: nota ? Number(nota) : undefined,
      comentario
    }
  })
}

export const editarAvaliacaoPorId = async (id, avaliacao) => {
  const { usuario_id, restaurante_id, nota, comentario } = avaliacao
  return await prisma.avaliacoes.update({
    where: { id: Number(id) },
    data: {
      usuario_id: usuario_id ? Number(usuario_id) : undefined,
      restaurante_id: restaurante_id ? Number(restaurante_id) : undefined,
      nota: nota ? Number(nota) : undefined,
      comentario: comentario || undefined
    }
  })
}

export const deletarAvaliacao = async id => {
  return await prisma.avaliacoes.delete({
    where: { id: Number(id) }
  })
}
