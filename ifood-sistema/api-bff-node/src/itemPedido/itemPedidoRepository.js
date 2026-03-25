import { prisma } from '../database/connection.js'

export const listarItensPedido = async () => {
  return await prisma.itens_pedido.findMany()
}

export const buscarItemPedidoPorId = async id => {
  return await prisma.itens_pedido.findUnique({
    where: { id: Number(id) }
  })
}

export const buscarItensPorPedidoId = async pedido_id => {
  return await prisma.itens_pedido.findMany({
    where: { pedido_id: Number(pedido_id) }
  })
}

export const criarItemPedido = async item => {
  const { pedido_id, produto_id, quantidade, preco_unitario } = item
  return await prisma.itens_pedido.create({
    data: {
      pedido_id: pedido_id ? Number(pedido_id) : undefined,
      produto_id: produto_id ? Number(produto_id) : undefined,
      quantidade: Number(quantidade),
      preco_unitario: preco_unitario ? Number(preco_unitario) : undefined
    }
  })
}

export const editarItemPedidoPorId = async (id, item) => {
  const { pedido_id, produto_id, quantidade, preco_unitario } = item
  return await prisma.itens_pedido.update({
    where: { id: Number(id) },
    data: {
      pedido_id: pedido_id ? Number(pedido_id) : undefined,
      produto_id: produto_id ? Number(produto_id) : undefined,
      quantidade: quantidade ? Number(quantidade) : undefined,
      preco_unitario: preco_unitario ? Number(preco_unitario) : undefined
    }
  })
}

export const deletarItemPedido = async id => {
  return await prisma.itens_pedido.delete({
    where: { id: Number(id) }
  })
}
