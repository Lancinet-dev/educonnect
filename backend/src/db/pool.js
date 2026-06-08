import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

export const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'educonnect',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:                    20,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 3000,
})

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL :', err.message)
})

// Fonction utilitaire pour les requêtes
export const query = (text, params) => pool.query(text, params)
