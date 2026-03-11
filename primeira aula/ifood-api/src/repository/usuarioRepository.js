import { pool } from '../database/connection.js'

export const listarUsuarios = async () => {
  const result = await pool.query('SELECT * FROM usuarios')
  return result.rows
}

export const buscarUsuarioPorId = async id => {
  const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id])

  return result.rows[0]
}

export const criarUsuario = async usuario => {
  const { nome, email, telefone, senha } = usuario

  const result = await pool.query(
    `INSERT INTO usuarios (nome,email,telefone,senha)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [nome, email, telefone, senha]
  )

  return result.rows[0]
}

export const editarUsuarioPorId = async (id, usuario) => {
  const { nome, email, telefone, senha } = usuario

  const result = await pool.query(
    `UPDATE usuarios 
     SET nome = COALESCE($1, nome), 
         email = COALESCE($2, email), 
         telefone = COALESCE($3, telefone), 
         senha = COALESCE($4, senha)
     WHERE id = $5
     RETURNING *`,
    [nome, email, telefone, senha, id]
  )

  return result.rows[0]
}

export const deletarUsuario = async id => {
  const result = await pool.query(
    'DELETE FROM usuarios WHERE id = $1 RETURNING *', 
    [id]
  )
  
  return result.rows[0]
}
