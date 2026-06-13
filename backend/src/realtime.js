import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { query } from './db/pool.js'

let io = null

const room = (userId) => `user:${userId}`

// Renvoie les autres participants d'une conversation SI l'utilisateur en fait
// partie ; sinon [] (non-participant → aucun relais). Empêche l'usurpation et
// la fuite d'évènements vers des conversations auxquelles on n'appartient pas.
async function otherParticipantsIfMember(conversationId, userId) {
  if (!conversationId) return []
  const { rows } = await query(
    'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
    [conversationId]
  )
  if (!rows.some(r => r.user_id === userId)) return []
  return rows.filter(r => r.user_id !== userId).map(r => r.user_id)
}

// Initialise Socket.IO avec authentification par token JWT
export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  })

  // Authentification : le client envoie le token dans handshake.auth.token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error('Authentification socket échouée.'))
    }
  })

  io.on('connection', (socket) => {
    socket.join(room(socket.userId))

    // Relais de l'indicateur « en train d'écrire » — destinataires dérivés
    // en base après vérification d'appartenance (le champ `to` client est ignoré).
    const relayTyping = (event) => async ({ conversationId }) => {
      try {
        const recipients = await otherParticipantsIfMember(conversationId, socket.userId)
        for (const uid of recipients) {
          io.to(room(uid)).emit(event, { conversationId, from: socket.userId })
        }
      } catch { /* relais best-effort : on ignore les erreurs */ }
    }
    socket.on('typing', relayTyping('typing'))
    socket.on('stop-typing', relayTyping('stop-typing'))
  })

  return io
}

// Émet un évènement vers tous les sockets d'un utilisateur
export function emitToUser(userId, event, payload) {
  if (io) io.to(room(userId)).emit(event, payload)
}

export function getIO() {
  return io
}
