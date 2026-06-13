import express from 'express'
import multer from 'multer'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { isCloudinaryConfigured, uploadBuffer } from '../config/cloudinary.js'

const router = express.Router()
router.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
})

const requireCloudinary = (req, res, next) => {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ error: "Service d'upload non configuré. Renseignez Cloudinary dans .env." })
  }
  next()
}

// ── GET /api/upload/status ────────────────────────────────────
router.get('/status', (req, res) => res.json({ enabled: isCloudinaryConfigured() }))

// ── POST /api/upload/avatar ───────────────────────────────────
router.post('/avatar', requireCloudinary, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' })
    if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Une image est requise.' })

    const result = await uploadBuffer(req.file.buffer, {
      folder: 'educonnect/avatars',
      public_id: `user_${req.user.id}`,
      overwrite: true,
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
    })
    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [result.secure_url, req.user.id])
    res.json({ url: result.secure_url })
  } catch (err) { next(err) }
})

// ── POST /api/upload/homework  (pièce jointe d'un devoir) ─────
router.post('/homework', authorize('teacher', 'school_admin', 'super_admin'),
  requireCloudinary, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' })
      const result = await uploadBuffer(req.file.buffer, {
        folder: 'educonnect/homework',
        resource_type: 'auto',
      })
      res.json({ url: result.secure_url, name: req.file.originalname })
    } catch (err) { next(err) }
  })

export default router
