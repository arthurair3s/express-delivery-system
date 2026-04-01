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
  const { usuario_id, restaurante_id, status, valor_total, destino_latitude, destino_longitude } = pedido
  return await prisma.pedidos.create({
    data: {
      usuario_id: Number(usuario_id),
      restaurante_id: Number(restaurante_id),
      status,
      valor_total: Number(valor_total),
      destino_latitude: Number(destino_latitude),
      destino_longitude: Number(destino_longitude)
    }
  })
}

export const editarPedidoPorId = async (id, pedido) => {
  const { usuario_id, restaurante_id, status, valor_total, destino_latitude, destino_longitude } = pedido
  return await prisma.pedidos.update({
    where: { id: Number(id) },
    data: {
      usuario_id: usuario_id ? Number(usuario_id) : undefined,
      restaurante_id: restaurante_id ? Number(restaurante_id) : undefined,
      status: status || undefined,
      valor_total: valor_total ? Number(valor_total) : undefined,
      destino_latitude: destino_latitude ? Number(destino_latitude) : undefined,
      destino_longitude: destino_longitude ? Number(destino_longitude) : undefined
    }
  })
}

export const deletarPedido = async id => {
  return await prisma.pedidos.delete({
    where: { id: Number(id) }
  })
}
