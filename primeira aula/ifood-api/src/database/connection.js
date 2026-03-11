import pkg from 'pg'

const { Pool } = pkg

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ifood_clone',
  password: 'postgres',
  port: 5432
})
