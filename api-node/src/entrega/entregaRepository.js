import { prisma } from '../database/connection.js'

export const listarEntregas = async () => {
  return await prisma.entregas.findMany()
}

export const buscarEntregaPorId = async id => {
  return await prisma.entregas.findUnique({
    where: { id: Number(id) }
  })
}

export const criarEntrega = async entrega => {
  const { pedido_id, entregador_id, status, previsao_entrega } = entrega
  return await prisma.entregas.create({
    data: {
      pedido_id: pedido_id ? Number(pedido_id) : undefined,
      entregador_id: entregador_id ? Number(entregador_id) : undefined,
      status,
      previsao_entrega: previsao_entrega ? new Date(previsao_entrega) : undefined
    }
  })
}

export const editarEntregaPorId = async (id, entrega) => {
  const { pedido_id, entregador_id, status, previsao_entrega } = entrega
  return await prisma.entregas.update({
    where: { id: Number(id) },
    data: {
      pedido_id: pedido_id ? Number(pedido_id) : undefined,
      entregador_id: entregador_id ? Number(entregador_id) : undefined,
      status: status || undefined,
      previsao_entrega: previsao_entrega ? new Date(previsao_entrega) : undefined
    }
  })
}

export const deletarEntrega = async id => {
  return await prisma.entregas.delete({
    where: { id: Number(id) }
  })
}

export const possuiEntregaAtivaNoRestaurante = async (entregadorId, restauranteId) => {
  const corrida = await prisma.entregas.findFirst({
    where: {
      entregador_id: Number(entregadorId),
      pedidos: {
        restaurante_id: Number(restauranteId)
      }
    }
  })
  return !!corrida;
}

