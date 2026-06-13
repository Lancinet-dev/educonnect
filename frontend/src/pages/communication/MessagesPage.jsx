import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Plus, Search, ArrowLeft, MessageSquare, X, CheckCheck } from 'lucide-react'
import {
  useConversations, useContacts, useConversation,
  useSendMessage, useStartConversation,
} from '@/hooks/useMessages'
import { getSocket } from '@/services/socket'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { ListSkeleton } from '@/components/ui/Skeleton'

const ROLE_LABEL = {
  school_admin: 'Direction', teacher: 'Enseignant', parent: 'Parent',
  student: 'Élève', accountant: 'Comptable', founder: 'Fondateur', surveillant: 'Surveillant',
}
const timeOf = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const isSameDay = (a, b) => a.toDateString() === b.toDateString()
function dayLabel(d) {
  const dt = new Date(d), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1)
  if (isSameDay(dt, now)) return "Aujourd'hui"
  if (isSameDay(dt, y)) return 'Hier'
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-surface-200 w-fit">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-surface-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  )
}

function NewConversation({ open, onClose, onStarted }) {
  const { data: contacts, isLoading } = useContacts()
  const start = useStartConversation()
  const [q, setQ] = useState('')
  const filtered = (contacts || []).filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between p-4 border-b border-surface-100">
        <h3 className="font-semibold text-surface-900">Nouvelle conversation</h3>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
      </div>
      <div className="p-3 border-b border-surface-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un contact…"
            className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>
      <div className="overflow-y-auto max-h-80">
        {isLoading ? <div className="flex justify-center py-8"><Spinner /></div>
          : filtered.length === 0 ? <p className="text-center text-surface-500 text-sm py-8">Aucun contact disponible.</p>
          : filtered.map(c => (
            <button key={c.id} disabled={start.isPending}
              onClick={async () => { const conv = await start.mutateAsync(c.id); onStarted(conv.id) }}
              className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 text-left transition-colors">
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.avatarUrl} size="md" role={c.role} />
              <div>
                <p className="text-sm font-medium text-surface-900">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-surface-500">{ROLE_LABEL[c.role] || c.role}</p>
              </div>
            </button>
          ))}
      </div>
    </Modal>
  )
}

function Thread({ conversationId, onBack }) {
  const { data, isLoading } = useConversation(conversationId)
  const send = useSendMessage()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const taRef = useRef(null)
  const typingTimeout = useRef(null)
  const lastEmit = useRef(0)

  const contact = data?.contact

  // Ouvrir une conversation la marque "lue" côté serveur → on rafraîchit
  // les compteurs (liste + cloche + badge sidebar) pour faire disparaître le non-lu.
  useEffect(() => {
    if (!data) return
    qc.invalidateQueries({ queryKey: ['conversations'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }, [conversationId, data?.id, qc])

  // Scroll vers le bas à l'arrivée de nouveaux messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages?.length, peerTyping])

  useEffect(() => {
    const s = getSocket(); if (!s) return
    const onTyping = ({ conversationId: cid }) => {
      if (cid === conversationId) {
        setPeerTyping(true)
        clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => setPeerTyping(false), 2500)
      }
    }
    const onStop = ({ conversationId: cid }) => { if (cid === conversationId) setPeerTyping(false) }
    s.on('typing', onTyping); s.on('stop-typing', onStop)
    return () => { s.off('typing', onTyping); s.off('stop-typing', onStop) }
  }, [conversationId])

  const onType = (e) => {
    setText(e.target.value)
    const ta = taRef.current
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px' }
    const s = getSocket()
    if (s && contact && Date.now() - lastEmit.current > 900) {
      lastEmit.current = Date.now()
      s.emit('typing', { conversationId, to: contact.id })
    }
  }

  const handleSend = async () => {
    if (!text.trim()) return
    const body = text.trim()
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
    getSocket()?.emit('stop-typing', { conversationId, to: contact?.id })
    await send.mutateAsync({ conversationId, body })
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  const otherRead = data.otherLastReadAt ? new Date(data.otherLastReadAt) : null
  const messages = data.messages || []

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* En-tête */}
      <div className="flex items-center gap-3 p-4 border-b border-surface-100 bg-white shrink-0">
        <button onClick={onBack} className="lg:hidden text-surface-500"><ArrowLeft size={18} /></button>
        {contact && <Avatar firstName={contact.firstName} lastName={contact.lastName} src={contact.avatarUrl} size="md" role={contact.role} />}
        <div>
          <p className="font-semibold text-surface-900">{contact?.firstName} {contact?.lastName}</p>
          <p className="text-xs text-surface-500 h-4">
            {peerTyping ? <span className="text-brand-600">en train d'écrire…</span> : (ROLE_LABEL[contact?.role] || contact?.role)}
          </p>
        </div>
      </div>

      {/* Messages (scrollable) */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 bg-surface-50/60">
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const showDay = !prev || !isSameDay(new Date(prev.at), new Date(m.at))
          const grouped = prev && prev.senderId === m.senderId && !showDay && (new Date(m.at) - new Date(prev.at) < 5 * 60 * 1000)
          const read = m.fromMe && otherRead && otherRead >= new Date(m.at)
          return (
            <div key={m.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-medium text-surface-500 bg-white border border-surface-200 rounded-full px-3 py-1 shadow-xs capitalize">{dayLabel(m.at)}</span>
                </div>
              )}
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-end gap-2 ${m.fromMe ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-2'}`}>
                {!m.fromMe && (
                  <div className="w-7 shrink-0">
                    {!grouped && <Avatar firstName={contact?.firstName} lastName={contact?.lastName} src={contact?.avatarUrl} size="xs" />}
                  </div>
                )}
                <div className={`max-w-[78%] px-3.5 py-2 text-sm shadow-xs ${
                  m.fromMe
                    ? `bg-brand-600 text-white rounded-2xl ${grouped ? 'rounded-tr-md' : 'rounded-br-md'}`
                    : `bg-white border border-surface-200 text-surface-800 rounded-2xl ${grouped ? 'rounded-tl-md' : 'rounded-bl-md'}`}`}>
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                  <div className={`flex items-center gap-1 justify-end mt-0.5 ${m.fromMe ? 'text-brand-100' : 'text-surface-400'}`}>
                    <span className="text-[10px]">{timeOf(m.at)}</span>
                    {m.fromMe && <CheckCheck size={13} className={read ? 'text-sky-300' : 'text-brand-200'} />}
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })}
        <AnimatePresence>
          {peerTyping && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2 mt-2">
              <div className="w-7 shrink-0"><Avatar firstName={contact?.firstName} lastName={contact?.lastName} src={contact?.avatarUrl} size="xs" /></div>
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Saisie */}
      <div className="p-3 border-t border-surface-100 bg-white flex items-end gap-2 shrink-0">
        <textarea ref={taRef} value={text} onChange={onType} rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Écrire un message…"
          className="flex-1 resize-none px-3.5 py-2.5 border border-surface-200 rounded-2xl text-sm leading-relaxed max-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={!text.trim() || send.isPending}
          animate={{ scale: text.trim() ? 1 : 0.92, opacity: text.trim() ? 1 : 0.5 }}
          className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-700 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0">
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { data: conversations, isLoading } = useConversations()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState(params.get('c') || null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { const c = params.get('c'); if (c) setSelected(c) }, [params])
  const selectConv = (id) => { setSelected(id); setParams({ c: id }) }

  return (
    <div className="h-[calc(100dvh-9rem)] min-h-[460px] flex flex-col">
      <h1 className="text-2xl font-bold font-display text-surface-900 mb-3 shrink-0">Messages</h1>

      <Card padding={false} className="flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">

          {/* Liste des conversations */}
          <div className={`border-r border-surface-100 flex flex-col min-h-0 ${selected ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center justify-between p-3 border-b border-surface-100 shrink-0">
              <span className="font-semibold text-surface-900 text-sm">Conversations</span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowNew(true)}
                className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 flex items-center justify-center transition-colors">
                <Plus size={18} />
              </motion.button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {isLoading ? (
                <div className="p-2"><ListSkeleton rows={6} /></div>
              ) : conversations?.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Aucune conversation" subtitle="Cliquez sur + pour démarrer un échange." />
              ) : conversations.map((c, idx) => (
                <motion.button key={c.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => selectConv(c.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left border-b border-surface-50 hover:bg-surface-50 transition-colors ${selected === c.id ? 'bg-brand-50' : ''}`}>
                  <Avatar firstName={c.contact.firstName} lastName={c.contact.lastName} src={c.contact.avatarUrl} size="md" role={c.contact.role} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-surface-900 truncate">{c.contact.firstName} {c.contact.lastName}</p>
                      {c.lastMessage && <span className="text-[10px] text-surface-400 shrink-0">{timeOf(c.lastMessage.at)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${c.unread > 0 ? 'text-surface-800 font-semibold' : 'text-surface-500'}`}>
                        {c.lastMessage ? (c.lastMessage.fromMe ? 'Vous : ' : '') + c.lastMessage.body : 'Nouvelle conversation'}
                      </p>
                      {c.unread > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Conversation ouverte */}
          <div className={`lg:col-span-2 min-h-0 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
            {selected ? (
              <Thread conversationId={selected} onBack={() => { setSelected(null); setParams({}) }} />
            ) : (
              <EmptyState icon={MessageSquare} title="Vos messages" subtitle="Sélectionnez une conversation pour commencer à discuter." className="flex-1" />
            )}
          </div>
        </div>
      </Card>

      <NewConversation open={showNew} onClose={() => setShowNew(false)}
        onStarted={(id) => { setShowNew(false); selectConv(id) }} />
    </div>
  )
}
