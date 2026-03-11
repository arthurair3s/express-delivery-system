import { pool } from '../database/connection.js'

export const listarProdutos = async () => {
  const result = await pool.query('SELECT * FROM produtos')
  return result.rows
}

export const buscarProdutoPorId = async id => {
  const result = await pool.query('SELECT * FROM produtos WHERE id = $1', [id])
  return result.rows[0]
}

export const criarProduto = async produto => {
  const { nome, descricao, preco, categoria_id } = produto

  const result = await pool.query(
    `INSERT INTO produtos (nome, descricao, preco, categoria_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nome, descricao, preco, categoria_id]
  )

  return result.rows[0]
}

export const editarProdutoPorId = async (id, produto) => {
  const { nome, descricao, preco, categoria_id } = produto

  const result = await pool.query(
    `UPDATE produtos 
     SET nome = COALESCE($1, nome), 
         descricao = COALESCE($2, descricao), 
         preco = COALESCE($3, preco),
         categoria_id = COALESCE($4, categoria_id)
     WHERE id = $5
     RETURNING *`,
    [nome, descricao, preco, categoria_id, id]
  )

  return result.rows[0]
}

export const deletarProduto = async id => {
  const result = await pool.query(
    'DELETE FROM produtos WHERE id = $1 RETURNING *',
    [id]
  )
  return result.rows[0]
}
