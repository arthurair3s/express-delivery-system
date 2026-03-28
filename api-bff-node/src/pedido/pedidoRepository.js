import { prisma } from '../database/connection.js'

export const listarPedidos = async () => {
  return await prisma.pedidos.findMany()
}

export const buscarPedidoPorId = async id => {
  return await prisma.pedidos.findUnique({
    where: { id: Number(id) }
  })
}

export const criarPedido = async pedido => {
  const { usuario_id, status, valor_total } = pedido
  return await prisma.pedidos.create({
    data: {
      usuario_id: Number(usuario_id),
      status,
      valor_total: Number(valor_total)
    }
  })
}

export const editarPedidoPorId = async (id, pedido) => {
  const { usuario_id, status, valor_total } = pedido
  return await prisma.pedidos.update({
    where: { id: Number(id) },
    data: {
      usuario_id: usuario_id ? Number(usuario_id) : undefined,
      status: status || undefined,
      valor_total: valor_total ? Number(valor_total) : undefined
    }
  })
}

export const deletarPedido = async id => {
  return await prisma.pedidos.delete({
    where: { id: Number(id) }
  })
}
