import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = express.Router()

// ── Générer les tokens ────────────────────────────────────────
const genererTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  )
  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  )
  return { accessToken, refreshToken }
}

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' })
    }

    const { rows } = await query(
      `SELECT
         u.*,
         s.name       AS school_name,
         s.logo_url   AS school_logo,
         s.plan       AS school_plan,
         s.short_name AS school_short_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    )

    const user = rows[0]

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }

    const motDePasseValide = await bcrypt.compare(password, user.password_hash)
    if (!motDePasseValide) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }

    const { accessToken, refreshToken } = genererTokens(user.id)

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshToken]
    )

    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    )

    const { password_hash, ...userSafe } = user

    res.json({ accessToken, refreshToken, user: userSafe })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         u.id, u.school_id, u.role,
         u.first_name, u.last_name,
         u.email, u.phone,
         u.avatar_url, u.gender,
         u.last_login, u.created_at,
         s.name       AS school_name,
         s.logo_url   AS school_logo,
         s.plan       AS school_plan,
         s.short_name AS school_short_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = $1`,
      [req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant.' })
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

    const { rows } = await query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
      [refreshToken, decoded.userId]
    )

    if (!rows[0]) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré.' })
    }

    // Rotation du token
    const nouveauxTokens = genererTokens(decoded.userId)

    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [decoded.userId, nouveauxTokens.refreshToken]
    )

    res.json(nouveauxTokens)
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token invalide.' })
    }
    next(err)
  }
})

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
    }
    res.json({ message: 'Déconnecté avec succès.' })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/change-password ───────────────────────────
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body

    if (!motDePasseActuel || !nouveauMotDePasse) {
      return res.status(400).json({ error: 'Les deux mots de passe sont requis.' })
    }
    if (nouveauMotDePasse.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
    }

    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    )

    const valide = await bcrypt.compare(motDePasseActuel, rows[0].password_hash)
    if (!valide) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' })
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 12)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id])

    // Invalider tous les sessions existantes
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id])

    res.json({ message: 'Mot de passe modifié avec succès.' })
  } catch (err) {
    next(err)
  }
})

export default router
