import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { emitToUser } from '../realtime.js'
import { visibleAnnouncements, getAnnouncementTargetUserIds } from '../services/comm.service.js'

const router = express.Router()
router.use(authenticate)

const VALID_TARGET   = ['school', 'teachers', 'parents', 'students', 'class']
const VALID_PRIORITY = ['normal', 'important', 'urgent']

const mapAnnouncement = (a) => ({
  id: a.id, title: a.title, body: a.body,
  target: a.target, targetClassId: a.target_class_id, priority: a.priority,
  createdAt: a.created_at,
  author: a.author_first ? `${a.author_first} ${a.author_last}` : null,
  isRead: a.is_read,
})

// ── GET /api/announcements ────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const rows = await visibleAnnouncements(req.user)
    res.json({
      announcements: rows.map(mapAnnouncement),
      unread: rows.filter(a => !a.is_read).length,
    })
  } catch (err) { next(err) }
})

// ── POST /api/announcements ───────────────────────────────────
router.post('/', authorize('school_admin', 'teacher', 'super_admin'), async (req, res, next) => {
  try {
    const { title, body, target = 'school', targetClassId = null, priority = 'normal' } = req.body
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Titre et contenu requis.' })
    }
    if (!VALID_TARGET.includes(target))     return res.status(400).json({ error: 'Cible invalide.' })
    if (!VALID_PRIORITY.includes(priority)) return res.status(400).json({ error: 'Priorité invalide.' })
    if (target === 'class' && !targetClassId) {
      return res.status(400).json({ error: 'Veuillez choisir une classe.' })
    }

    const { rows } = await query(
      `INSERT INTO announcements (school_id, author_id, title, body, target, target_class_id, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.school_id, req.user.id, title.trim(), body.trim(), target, target === 'class' ? targetClassId : null, priority]
    )
    const ann = rows[0]

    // Notifier les destinataires en temps réel
    const targetIds = await getAnnouncementTargetUserIds(ann)
    for (const uid of targetIds) {
      if (uid === req.user.id) continue
      emitToUser(uid, 'announcement:new', { id: ann.id, title: ann.title, priority: ann.priority })
      emitToUser(uid, 'notification', { type: 'announcement', announcementId: ann.id })
    }

    res.status(201).json(mapAnnouncement({ ...ann, author_first: req.user.first_name, author_last: req.user.last_name, is_read: true }))
  } catch (err) { next(err) }
})

// ── POST /api/announcements/:id/read ──────────────────────────
router.post('/:id/read', async (req, res, next) => {
  try {
    await query(
      `INSERT INTO announcement_reads (announcement_id, user_id) VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
