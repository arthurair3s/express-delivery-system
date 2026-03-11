import { pool } from '../database/connection.js'

export const listarEntregas = async () => {
  const result = await pool.query('SELECT * FROM entregas')
  return result.rows
}

export const buscarEntregaPorId = async id => {
  const result = await pool.query('SELECT * FROM entregas WHERE id = $1', [id])
  return result.rows[0]
}

export const criarEntrega = async entrega => {
  const { pedido_id, entregador_id, status, previsao_entrega } = entrega

  const result = await pool.query(
    `INSERT INTO entregas (pedido_id, entregador_id, status, previsao_entrega)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [pedido_id, entregador_id, status, previsao_entrega]
  )

  return result.rows[0]
}

export const editarEntregaPorId = async (id, entrega) => {
  const { pedido_id, entregador_id, status, previsao_entrega } = entrega

  const result = await pool.query(
    `UPDATE entregas 
     SET pedido_id = COALESCE($1, pedido_id), 
         entregador_id = COALESCE($2, entregador_id),
         status = COALESCE($3, status),
         previsao_entrega = COALESCE($4, previsao_entrega)
     WHERE id = $5
     RETURNING *`,
    [pedido_id, entregador_id, status, previsao_entrega, id]
  )

  return result.rows[0]
}

export const deletarEntrega = async id => {
  const result = await pool.query('DELETE FROM entregas WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}
