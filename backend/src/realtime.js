import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

let io = null

const room = (userId) => `user:${userId}`

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

    // Relais de l'indicateur « en train d'écrire »
    socket.on('typing', ({ conversationId, to }) => {
      if (to) io.to(room(to)).emit('typing', { conversationId, from: socket.userId })
    })
    socket.on('stop-typing', ({ conversationId, to }) => {
      if (to) io.to(room(to)).emit('stop-typing', { conversationId, from: socket.userId })
    })
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
