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

    // Devoirs récents (14 j) pour élèves & parents → « non lu » tant que non fait
    let homeworkItems = []
    if (req.user.role === 'student') {
      const { rows } = await query(
        `SELECT h.id, h.title, h.created_at, s.name AS subject,
                (hd.student_id IS NOT NULL) AS done
         FROM homework h
         JOIN class_students cs ON cs.class_id = h.class_id AND cs.student_id = $1
         LEFT JOIN subjects s ON s.id = h.subject_id
         LEFT JOIN homework_done hd ON hd.homework_id = h.id AND hd.student_id = $1
         WHERE h.created_at >= NOW() - INTERVAL '14 days'
         ORDER BY h.created_at DESC`,
        [req.user.id]
      )
      homeworkItems = rows.map(h => ({
        type: 'homework', homeworkId: h.id,
        title: `Devoir : ${h.title}`, body: h.subject, createdAt: h.created_at, read: h.done,
      }))
    } else if (req.user.role === 'parent') {
      const { rows } = await query(
        `SELECT h.id, h.title, h.created_at, s.name AS subject,
                (hd.student_id IS NOT NULL) AS done
         FROM homework h
         JOIN class_students cs ON cs.class_id = h.class_id
         JOIN parent_students ps ON ps.student_id = cs.student_id AND ps.parent_id = $1
         LEFT JOIN subjects s ON s.id = h.subject_id
         LEFT JOIN homework_done hd ON hd.homework_id = h.id AND hd.student_id = cs.student_id
         WHERE h.created_at >= NOW() - INTERVAL '14 days'
         ORDER BY h.created_at DESC`,
        [req.user.id]
      )
      homeworkItems = rows.map(h => ({
        type: 'homework', homeworkId: h.id,
        title: `Devoir : ${h.title}`, body: h.subject, createdAt: h.created_at, read: h.done,
      }))
    }

    const unreadMessages = messageItems.reduce((s, i) => s + i.unread, 0)
    const unreadAnnouncements = announcementItems.filter(a => !a.read).length
    const unreadHomework = homeworkItems.filter(h => !h.read).length

    const items = [...messageItems, ...announcementItems, ...homeworkItems]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 15)

    res.json({
      unreadCount: unreadMessages + unreadAnnouncements + unreadHomework,
      items,
    })
  } catch (err) { next(err) }
})

export default router
