import { io } from 'socket.io-client'

let socket = null
let currentToken = null

// Connecte le socket (même origine → proxifié par Vite vers le backend).
// Si le token a changé (autre utilisateur), on ferme l'ancienne connexion
// pour ne jamais rester authentifié avec un compte précédent.
export function connectSocket(token) {
  if (socket && currentToken === token) return socket
  if (socket) {
    socket.disconnect()
    socket = null
  }
  currentToken = token
  socket = io({ auth: { token }, transports: ['websocket', 'polling'] })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  currentToken = null
}
