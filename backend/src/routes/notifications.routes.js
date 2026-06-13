import express from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { visibleAnnouncements } from '../services/comm.service.js'

const router = express.Router()
router.use(authenticate)

// ── GET /api/notifications ────────────────────────────────────
// Agrège messages non lus + annonces (récentes), pour la cloche
router.get('/', async (req, res, next) => {
  try {
    // Conversations avec messages non lus
    const { rows: convs } = await query(
      `SELECT c.id AS conversation_id,
              other.first_name, other.last_name,
              lm.body, lm.created_at,
              (SELECT COUNT(*) FROM messages m
                 WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_id <> $1) AS unread
       FROM conversation_participants cp
       JOIN conversations c ON c.id = cp.conversation_id
       JOIN conversation_participants ocp ON ocp.conversation_id = c.id AND ocp.user_id <> $1
       JOIN users other ON other.id = ocp.user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at FROM messages
         WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE
       WHERE cp.user_id = $1
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    )

    const messageItems = convs
      .filter(c => parseInt(c.unread) > 0)
      .map(c => ({
        type: 'message',
        conversationId: c.conversation_id,
        title: `${c.first_name} ${c.last_name}`,
        body: c.body,
        createdAt: c.created_at,
        unread: parseInt(c.unread),
        read: false,
      }))

    // Annonces récentes (10) avec statut lu
    const anns = await visibleAnnouncements(req.user, 10)
    const announcementItems = anns.map(a => ({
      type: 'announcement',
      announcementId: a.id,
      title: a.title,
      body: a.body,
      priority: a.priority,
      createdAt: a.created_at,
      read: a.is_read,
    }))

    const unreadMessages = messageItems.reduce((s, i) => s + i.unread, 0)
    const unreadAnnouncements = announcementItems.filter(a => !a.read).length

    const items = [...messageItems, ...announcementItems]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 15)

    res.json({
      unreadCount: unreadMessages + unreadAnnouncements,
      items,
    })
  } catch (err) { next(err) }
})

export default router
