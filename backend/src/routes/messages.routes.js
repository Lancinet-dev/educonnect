import express from 'express'
import { authenticate } from '../middleware/auth.middleware.js'
import { query } from '../db/pool.js'
import { emitToUser } from '../realtime.js'
import { getContacts } from '../services/comm.service.js'

const router = express.Router()
router.use(authenticate)

// Vérifie que l'utilisateur fait partie de la conversation
async function isParticipant(conversationId, userId) {
  const { rows } = await query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  )
  return !!rows[0]
}

// ── GET /api/messages/contacts ────────────────────────────────
router.get('/contacts', async (req, res, next) => {
  try {
    const rows = await getContacts(req.user)
    res.json(rows.map(c => ({
      id: c.id, firstName: c.first_name, lastName: c.last_name, role: c.role, avatarUrl: c.avatar_url,
    })))
  } catch (err) { next(err) }
})

// ── GET /api/messages/conversations ───────────────────────────
router.get('/conversations', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.last_message_at,
              other.id AS other_id, other.first_name, other.last_name, other.role, other.avatar_url,
              lm.body AS last_body, lm.created_at AS last_at, lm.sender_id AS last_sender,
              (SELECT COUNT(*) FROM messages m
                 WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at AND m.sender_id <> $1) AS unread
       FROM conversation_participants cp
       JOIN conversations c  ON c.id = cp.conversation_id
       JOIN conversation_participants ocp ON ocp.conversation_id = c.id AND ocp.user_id <> $1
       JOIN users other      ON other.id = ocp.user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at, sender_id FROM messages
         WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE
       WHERE cp.user_id = $1
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    )
    res.json(rows.map(c => ({
      id: c.id,
      contact: { id: c.other_id, firstName: c.first_name, lastName: c.last_name, role: c.role, avatarUrl: c.avatar_url },
      lastMessage: c.last_body ? { body: c.last_body, at: c.last_at, fromMe: c.last_sender === req.user.id } : null,
      unread: parseInt(c.unread) || 0,
    })))
  } catch (err) { next(err) }
})

// ── POST /api/messages/conversations  { recipientId } ─────────
// Trouve ou crée une conversation 1:1
router.post('/conversations', async (req, res, next) => {
  try {
    const { recipientId } = req.body
    if (!recipientId || recipientId === req.user.id) {
      return res.status(400).json({ error: 'Destinataire invalide.' })
    }

    // Vérifier que le destinataire est un contact autorisé
    const contacts = await getContacts(req.user)
    if (!contacts.some(c => c.id === recipientId)) {
      return res.status(403).json({ error: 'Vous ne pouvez pas contacter cet utilisateur.' })
    }

    // Conversation existante ?
    const { rows: existing } = await query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
       JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
       LIMIT 1`,
      [req.user.id, recipientId]
    )
    if (existing[0]) return res.json({ id: existing[0].id })

    const { rows: created } = await query(
      `INSERT INTO conversations (school_id) VALUES ($1) RETURNING id`,
      [req.user.school_id]
    )
    const convId = created[0].id
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [convId, req.user.id, recipientId]
    )
    res.status(201).json({ id: convId })
  } catch (err) { next(err) }
})

// ── GET /api/messages/conversations/:id ───────────────────────
// Messages + marque la conversation comme lue
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!(await isParticipant(id, req.user.id))) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }

    const { rows: contactRows } = await query(
      `SELECT u.id, u.first_name, u.last_name, u.role, u.avatar_url
       FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1 AND cp.user_id <> $2`,
      [id, req.user.id]
    )

    const { rows: messages } = await query(
      `SELECT id, sender_id, body, created_at
       FROM messages WHERE conversation_id = $1 ORDER BY created_at`,
      [id]
    )

    await query(
      `UPDATE conversation_participants SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [id, req.user.id]
    )

    const c = contactRows[0]
    res.json({
      id,
      contact: c ? { id: c.id, firstName: c.first_name, lastName: c.last_name, role: c.role, avatarUrl: c.avatar_url } : null,
      messages: messages.map(m => ({
        id: m.id, body: m.body, at: m.created_at, fromMe: m.sender_id === req.user.id, senderId: m.sender_id,
      })),
    })
  } catch (err) { next(err) }
})

// ── POST /api/messages/conversations/:id/messages  { body } ───
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Message vide.' })
    if (!(await isParticipant(id, req.user.id))) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }

    const { rows } = await query(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [id, req.user.id, body.trim()]
    )
    await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [id])

    const message = {
      id: rows[0].id, body: body.trim(), at: rows[0].created_at, senderId: req.user.id,
    }

    // Notifier les autres participants en temps réel
    const { rows: others } = await query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2',
      [id, req.user.id]
    )
    for (const o of others) {
      emitToUser(o.user_id, 'message:new', {
        conversationId: id,
        message: { ...message, fromMe: false },
        from: { id: req.user.id, firstName: req.user.first_name, lastName: req.user.last_name },
      })
      emitToUser(o.user_id, 'notification', { type: 'message', conversationId: id })
    }

    res.status(201).json({ ...message, fromMe: true })
  } catch (err) { next(err) }
})

export default router
