import { pool } from '../database/connection.js'

export const listarEntregadores = async () => {
  const result = await pool.query('SELECT * FROM entregadores')
  return result.rows
}

export const buscarEntregadorPorId = async id => {
  const result = await pool.query('SELECT * FROM entregadores WHERE id = $1', [id])
  return result.rows[0]
}

export const criarEntregador = async entregador => {
  const { nome, telefone, veiculo } = entregador

  const result = await pool.query(
    `INSERT INTO entregadores (nome, telefone, veiculo)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [nome, telefone, veiculo]
  )

  return result.rows[0]
}

export const editarEntregadorPorId = async (id, entregador) => {
  const { nome, telefone, veiculo } = entregador

  const result = await pool.query(
    `UPDATE entregadores 
     SET nome = COALESCE($1, nome), 
         telefone = COALESCE($2, telefone),
         veiculo = COALESCE($3, veiculo)
     WHERE id = $4
     RETURNING *`,
    [nome, telefone, veiculo, id]
  )

  return result.rows[0]
}

export const deletarEntregador = async id => {
  const result = await pool.query('DELETE FROM entregadores WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}
