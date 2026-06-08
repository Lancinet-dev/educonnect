import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { pool } from './db/pool.js'
import { errorHandler } from './middleware/error.middleware.js'

const app        = express()
const httpServer = createServer(app)

// ── Socket.IO ──────────────────────────────────────────
export const io = new Server(httpServer, {
  cors: {
    origin:      process.env.FRONTEND_URL,
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log(`🔌 Socket connecté : ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`❌ Socket déconnecté : ${socket.id}`)
  })
})

// ── Middlewares Express ────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  message:  { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
}))

// ── Routes (à ajouter progressivement) ────────────────
// app.use('/api/auth',  authRoutes)
// app.use('/api/users', userRoutes)
// etc.

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connectée', timestamp: new Date().toISOString() })
  } catch {
    res.status(500).json({ status: 'error', db: 'déconnectée' })
  }
})

// ── Gestion des erreurs ────────────────────────────────
app.use(errorHandler)

// ── Démarrage ──────────────────────────────────────────
const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`\n🚀  EduConnect API → http://localhost:${PORT}`)
  console.log(`📡  Socket.IO actif`)
  console.log(`🗄️   Base : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`)
})
