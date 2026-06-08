import jwt from 'jsonwebtoken'
import { query } from '../db/pool.js'

// Vérifier le token JWT
export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentification requise.' })
    }
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const { rows } = await query(
      `SELECT id, school_id, role, first_name, last_name, email, avatar_url, is_active
       FROM users WHERE id = $1`,
      [decoded.userId]
    )

    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou désactivé.' })
    }

    req.user = rows[0]
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' })
  }
}

// Vérifier les rôles autorisés
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Accès refusé.',
      required: roles,
      current: req.user.role
    })
  }
  next()
}
