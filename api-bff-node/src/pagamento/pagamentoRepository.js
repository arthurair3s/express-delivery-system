import { prisma } from '../database/connection.js'

export const listarPagamentos = async () => {
  return await prisma.pagamentos.findMany()
}

export const buscarPagamentoPorId = async id => {
  return await prisma.pagamentos.findUnique({
    where: { id: Number(id) }
  })
}

export const criarPagamento = async pagamento => {
  const { pedido_id, metodo, status, valor } = pagamento
  return await prisma.pagamentos.create({
    data: {
      pedido_id: pedido_id ? Number(pedido_id) : undefined,
      metodo,
      status,
      valor: valor ? Number(valor) : undefined
    }
  })
}

export const editarPagamentoPorId = async (id, pagamento) => {
  const { pedido_id, metodo, status, valor } = pagamento
  return await prisma.pagamentos.update({
    where: { id: Number(id) },
    data: {
      pedido_id: pedido_id ? Number(pedido_id) : undefined,
      metodo: metodo || undefined,
      status: status || undefined,
      valor: valor ? Number(valor) : undefined
    }
  })
}

export const deletarPagamento = async id => {
  return await prisma.pagamentos.delete({
    where: { id: Number(id) }
  })
}
