import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Plus, Search, ArrowLeft, MessageSquare, X } from 'lucide-react'
import {
  useConversations, useContacts, useConversation,
  useSendMessage, useStartConversation,
} from '@/hooks/useMessages'
import { getSocket } from '@/services/socket'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

const ROLE_LABEL = {
  school_admin: 'Direction', teacher: 'Enseignant', parent: 'Parent',
  student: 'Élève', accountant: 'Comptable', founder: 'Fondateur',
}
const timeOf = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// ── Sélecteur de nouveau contact ──────────────────────────────
function NewConversation({ onClose, onStarted }) {
  const { data: contacts, isLoading } = useContacts()
  const start = useStartConversation()
  const [q, setQ] = useState('')

  const filtered = (contacts || []).filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
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
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-surface-500 text-sm py-8">Aucun contact disponible.</p>
          ) : filtered.map(c => (
            <button key={c.id} disabled={start.isPending}
              onClick={async () => { const conv = await start.mutateAsync(c.id); onStarted(conv.id) }}
              className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 text-left">
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.avatarUrl} size="md" />
              <div>
                <p className="text-sm font-medium text-surface-900">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-surface-500">{ROLE_LABEL[c.role] || c.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Fil de conversation ───────────────────────────────────────
function Thread({ conversationId, onBack }) {
  const { data, isLoading } = useConversation(conversationId)
  const send = useSendMessage()
  const [text, setText] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const bottomRef = useRef(null)
  const typingTimeout = useRef(null)

  const contact = data?.contact

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [data?.messages?.length, peerTyping])

  // Indicateur « en train d'écrire » entrant
  useEffect(() => {
    const s = getSocket()
    if (!s) return
    const onTyping = ({ conversationId: cid }) => {
      if (cid === conversationId) {
        setPeerTyping(true)
        clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => setPeerTyping(false), 2500)
      }
    }
    s.on('typing', onTyping)
    return () => s.off('typing', onTyping)
  }, [conversationId])

  const handleType = (e) => {
    setText(e.target.value)
    const s = getSocket()
    if (s && contact) s.emit('typing', { conversationId, to: contact.id })
  }

  const handleSend = async () => {
    if (!text.trim()) return
    const body = text.trim()
    setText('')
    await send.mutateAsync({ conversationId, body })
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="flex items-center gap-3 p-4 border-b border-surface-100">
        <button onClick={onBack} className="lg:hidden text-surface-500"><ArrowLeft size={18} /></button>
        {contact && <Avatar firstName={contact.firstName} lastName={contact.lastName} src={contact.avatarUrl} size="md" />}
        <div>
          <p className="font-semibold text-surface-900">{contact?.firstName} {contact?.lastName}</p>
          <p className="text-xs text-surface-500">{ROLE_LABEL[contact?.role] || contact?.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-surface-50">
        {data.messages.map(m => (
          <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
              m.fromMe ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-surface-200 text-surface-800 rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`text-[10px] mt-1 ${m.fromMe ? 'text-brand-100' : 'text-surface-400'}`}>{timeOf(m.at)}</p>
            </div>
          </div>
        ))}
        {peerTyping && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2 rounded-2xl bg-white border border-surface-200 text-surface-400 text-xs italic">
              en train d'écrire…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Saisie */}
      <div className="p-3 border-t border-surface-100 flex items-center gap-2">
        <input value={text} onChange={handleType}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Écrire un message…"
          className="flex-1 px-3.5 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button onClick={handleSend} disabled={!text.trim() || send.isPending}
          className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { data: conversations, isLoading } = useConversations()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState(params.get('c') || null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    const c = params.get('c')
    if (c) setSelected(c)
  }, [params])

  const selectConv = (id) => { setSelected(id); setParams({ c: id }) }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold font-display text-surface-900 mb-4">Messages</h1>

      <Card padding={false} className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-220px)] min-h-[400px]">

          {/* Liste des conversations */}
          <div className={`border-r border-surface-100 flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex items-center justify-between p-3 border-b border-surface-100">
              <span className="font-semibold text-surface-900 text-sm">Conversations</span>
              <button onClick={() => setShowNew(true)}
                className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 flex items-center justify-center">
                <Plus size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : conversations?.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MessageSquare size={28} className="text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-500">Aucune conversation</p>
                  <p className="text-xs text-surface-400 mt-1">Cliquez sur + pour démarrer.</p>
                </div>
              ) : conversations.map(c => (
                <button key={c.id} onClick={() => selectConv(c.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left border-b border-surface-50 hover:bg-surface-50 ${
                    selected === c.id ? 'bg-brand-50' : ''}`}>
                  <Avatar firstName={c.contact.firstName} lastName={c.contact.lastName} src={c.contact.avatarUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-surface-900 truncate">{c.contact.firstName} {c.contact.lastName}</p>
                      {c.lastMessage && <span className="text-[10px] text-surface-400 shrink-0">{timeOf(c.lastMessage.at)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-surface-500 truncate">
                        {c.lastMessage ? (c.lastMessage.fromMe ? 'Vous : ' : '') + c.lastMessage.body : 'Nouvelle conversation'}
                      </p>
                      {c.unread > 0 && <Badge variant="primary">{c.unread}</Badge>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation ouverte */}
          <div className={`lg:col-span-2 ${selected ? 'flex' : 'hidden lg:flex'} flex-col`}>
            {selected ? (
              <Thread conversationId={selected} onBack={() => { setSelected(null); setParams({}) }} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">
                Sélectionnez une conversation
              </div>
            )}
          </div>
        </div>
      </Card>

      {showNew && (
        <NewConversation onClose={() => setShowNew(false)}
          onStarted={(id) => { setShowNew(false); selectConv(id) }} />
      )}
    </div>
  )
}
