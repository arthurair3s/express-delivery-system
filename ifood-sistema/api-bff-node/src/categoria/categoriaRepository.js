import { prisma } from '../database/connection.js'

export const listarCategorias = async () => {
  return await prisma.categorias.findMany()
}

export const buscarCategoriaPorId = async id => {
  return await prisma.categorias.findUnique({
    where: { id: Number(id) }
  })
}

export const criarCategoria = async categoria => {
  const { nome, restaurante_id } = categoria
  return await prisma.categorias.create({
    data: { 
      nome, 
      restaurante_id: restaurante_id ? Number(restaurante_id) : undefined 
    }
  })
}

export const editarCategoriaPorId = async (id, categoria) => {
  const { nome, restaurante_id } = categoria
  return await prisma.categorias.update({
    where: { id: Number(id) },
    data: {
      nome: nome || undefined,
      restaurante_id: restaurante_id ? Number(restaurante_id) : undefined
    }
  })
}

export const deletarCategoria = async id => {
  return await prisma.categorias.delete({
    where: { id: Number(id) }
  })
}
