import { io } from 'socket.io-client'

let socket = null

// Connecte le socket (même origine → proxifié par Vite vers le backend)
export function connectSocket(token) {
  if (socket) return socket
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
}
