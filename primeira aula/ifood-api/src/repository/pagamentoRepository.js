import { pool } from '../database/connection.js'

export const listarPagamentos = async () => {
  const result = await pool.query('SELECT * FROM pagamentos')
  return result.rows
}

export const buscarPagamentoPorId = async id => {
  const result = await pool.query('SELECT * FROM pagamentos WHERE id = $1', [id])
  return result.rows[0]
}

export const criarPagamento = async pagamento => {
  const { pedido_id, metodo, status, valor } = pagamento

  const result = await pool.query(
    `INSERT INTO pagamentos (pedido_id,metodo,status,valor)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [pedido_id, metodo, status, valor]
  )

  return result.rows[0]
}

export const editarPagamentoPorId = async (id, pagamento) => {
  const { pedido_id, metodo, status, valor } = pagamento

  const result = await pool.query(
    `UPDATE pagamentos
     SET pedido_id = COALESCE($1, pedido_id),
         metodo = COALESCE($2, metodo),
         status = COALESCE($3, status),
         valor = COALESCE($4, valor)
     WHERE id = $5
     RETURNING *`,
    [pedido_id, metodo, status, valor, id]
  )

  return result.rows[0]
}

export const deletarPagamento = async id => {
  const result = await pool.query(
    'DELETE FROM pagamentos WHERE id = $1 RETURNING *',
    [id]
  )

  return result.rows[0]
}
