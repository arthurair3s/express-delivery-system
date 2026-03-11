import { pool } from '../database/connection.js'

export const listarCategorias = async () => {
  const result = await pool.query('SELECT * FROM categorias')
  return result.rows
}

export const buscarCategoriaPorId = async id => {
  const result = await pool.query('SELECT * FROM categorias WHERE id = $1', [id])
  return result.rows[0]
}

export const criarCategoria = async categoria => {
  const { nome, restaurante_id } = categoria

  const result = await pool.query(
    `INSERT INTO categorias (nome, restaurante_id)
     VALUES ($1, $2)
     RETURNING *`,
    [nome, restaurante_id]
  )

  return result.rows[0]
}

export const editarCategoriaPorId = async (id, categoria) => {
  const { nome, restaurante_id } = categoria

  const result = await pool.query(
    `UPDATE categorias 
     SET nome = COALESCE($1, nome), 
         restaurante_id = COALESCE($2, restaurante_id)
     WHERE id = $3
     RETURNING *`,
    [nome, restaurante_id, id]
  )

  return result.rows[0]
}

export const deletarCategoria = async id => {
  const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}
