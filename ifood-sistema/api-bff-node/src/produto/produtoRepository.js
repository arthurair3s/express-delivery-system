import { prisma } from '../database/connection.js'

export const listarProdutos = async () => {
  return await prisma.produtos.findMany()
}

export const buscarProdutoPorId = async id => {
  return await prisma.produtos.findUnique({
    where: { id: Number(id) }
  })
}

export const criarProduto = async produto => {
  const { nome, descricao, preco, categoria_id } = produto
  return await prisma.produtos.create({
    data: {
      nome,
      descricao,
      preco: Number(preco),
      categoria_id: categoria_id ? Number(categoria_id) : undefined
    }
  })
}

export const editarProdutoPorId = async (id, produto) => {
  const { nome, descricao, preco, categoria_id } = produto
  return await prisma.produtos.update({
    where: { id: Number(id) },
    data: {
      nome: nome || undefined,
      descricao: descricao || undefined,
      preco: preco ? Number(preco) : undefined,
      categoria_id: categoria_id ? Number(categoria_id) : undefined
    }
  })
}

export const deletarProduto = async id => {
  return await prisma.produtos.delete({
    where: { id: Number(id) }
  })
}
