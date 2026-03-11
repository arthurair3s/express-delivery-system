import { pool } from '../database/connection.js'

export const listarAvaliacoes = async () => {
  const result = await pool.query('SELECT * FROM avaliacoes')
  return result.rows
}

export const buscarAvaliacaoPorId = async id => {
  const result = await pool.query('SELECT * FROM avaliacoes WHERE id = $1', [id])
  return result.rows[0]
}

export const criarAvaliacao = async avaliacao => {
  const { usuario_id, restaurante_id, nota, comentario } = avaliacao

  const result = await pool.query(
    `INSERT INTO avaliacoes (usuario_id, restaurante_id, nota, comentario)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [usuario_id, restaurante_id, nota, comentario]
  )

  return result.rows[0]
}

export const editarAvaliacaoPorId = async (id, avaliacao) => {
  const { usuario_id, restaurante_id, nota, comentario } = avaliacao

  const result = await pool.query(
    `UPDATE avaliacoes 
     SET usuario_id = COALESCE($1, usuario_id), 
         restaurante_id = COALESCE($2, restaurante_id),
         nota = COALESCE($3, nota),
         comentario = COALESCE($4, comentario)
     WHERE id = $5
     RETURNING *`,
    [usuario_id, restaurante_id, nota, comentario, id]
  )

  return result.rows[0]
}

export const deletarAvaliacao = async id => {
  const result = await pool.query('DELETE FROM avaliacoes WHERE id = $1 RETURNING *', [id])
  return result.rows[0]
}
