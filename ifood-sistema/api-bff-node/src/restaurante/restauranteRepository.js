import { prisma } from '../database/connection.js'

export const listarRestaurantes = async () => {
  return await prisma.restaurantes.findMany()
}

export const buscarRestaurantePorId = async id => {
  return await prisma.restaurantes.findUnique({
    where: { id: Number(id) }
  })
}

export const criarRestaurante = async restaurante => {
  const { nome, descricao, endereco } = restaurante
  return await prisma.restaurantes.create({
    data: { nome, descricao, endereco }
  })
}

export const editarRestaurantePorId = async (id, restaurante) => {
  const { nome, descricao, endereco } = restaurante
  return await prisma.restaurantes.update({
    where: { id: Number(id) },
    data: {
      nome: nome || undefined,
      descricao: descricao || undefined,
      endereco: endereco || undefined
    }
  })
}

export const deletarRestaurante = async id => {
  return await prisma.restaurantes.delete({
    where: { id: Number(id) }
  })
}
