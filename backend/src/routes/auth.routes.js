import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query, pool } from '../db/pool.js'
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

// ── POST /api/auth/register-school ────────────────────────────
// Inscription self-service : crée une école + son compte directeur,
// puis connecte automatiquement l'utilisateur.
router.post('/register-school', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { school = {}, admin = {} } = req.body
    const { name, type = 'private', city, region, phone, email: schoolEmail, plan = 'free' } = school
    const { firstName, lastName, email, password } = admin

    if (!name?.trim()) { client.release(); return res.status(400).json({ error: "Nom de l'école requis." }) }
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      client.release(); return res.status(400).json({ error: 'Informations du compte administrateur incomplètes.' })
    }
    if (password.length < 8) { client.release(); return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' }) }
    if (!['public', 'private'].includes(type)) { client.release(); return res.status(400).json({ error: 'Type d\'école invalide.' }) }
    if (!['free', 'premium'].includes(plan)) { client.release(); return res.status(400).json({ error: 'Plan invalide.' }) }

    const shortName = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 5) || 'ECO'
    const maxClasses = plan === 'free' ? 3 : 1000

    // Année scolaire courante (démarre en septembre)
    const now = new Date()
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const label = `${startYear}-${startYear + 1}`

    await client.query('BEGIN')

    const { rows: [sch] } = await client.query(
      `INSERT INTO schools (name, short_name, type, plan, city, region, phone, email, max_classes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [name.trim(), shortName, type, plan, city?.trim() || null, region?.trim() || null,
       phone?.trim() || null, schoolEmail?.trim() || null, maxClasses]
    )
    const schoolId = sch.id

    await client.query(
      `INSERT INTO academic_years (school_id, label, start_date, end_date, is_current)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [schoolId, label, `${startYear}-09-01`, `${startYear + 1}-07-31`]
    )

    const hash = await bcrypt.hash(password, 12)
    const { rows: [usr] } = await client.query(
      `INSERT INTO users (school_id, role, first_name, last_name, email, password_hash)
       VALUES ($1, 'school_admin', $2, $3, $4, $5) RETURNING id`,
      [schoolId, firstName.trim(), lastName.trim(), email.trim().toLowerCase(), hash]
    )

    const { accessToken, refreshToken } = genererTokens(usr.id)
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [usr.id, refreshToken]
    )

    await client.query('COMMIT')

    // Récupérer l'utilisateur au même format que le login
    const { rows: [user] } = await query(
      `SELECT u.id, u.school_id, u.role, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.gender,
              s.name AS school_name, s.logo_url AS school_logo, s.plan AS school_plan, s.short_name AS school_short_name
       FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = $1`,
      [usr.id]
    )

    res.status(201).json({ accessToken, refreshToken, user })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    next(err)
  } finally {
    client.release()
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
