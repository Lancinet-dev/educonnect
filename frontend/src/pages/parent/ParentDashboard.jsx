import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Clock, HelpCircle,
  Wallet, Award, Bell, CreditCard, GraduationCap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useParentOverview } from '@/hooks/useParentData'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useAuth } from '@/hooks/useAuth'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { formatGNF } from '@/utils/format'
import ParentAttendance from './ParentAttendance'
import ParentResults from './ParentResults'
import MessagesPage from '@/pages/communication/MessagesPage'
import AnnouncementsPage from '@/pages/communication/AnnouncementsPage'

// ── Affichage du statut de présence (gros bloc coloré) ────────
const ATTENDANCE = {
  present: { label: 'Présent(e)',     icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'border-emerald-200' },
  absent:  { label: 'Absent(e)',      icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700',     ring: 'border-red-200' },
  late:    { label: 'En retard',      icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'border-amber-200' },
  excused: { label: 'Absence excusée',icon: HelpCircle,   bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'border-blue-200' },
}
const ATTENDANCE_NONE = { label: 'Non renseignée', icon: HelpCircle, bg: 'bg-surface-50', text: 'text-surface-500', ring: 'border-surface-200' }

function AttendanceBlock({ status }) {
  const a = ATTENDANCE[status] || ATTENDANCE_NONE
  const Icon = a.icon
  return (
    <div className={`rounded-2xl border ${a.ring} ${a.bg} p-6 flex flex-col items-center justify-center text-center`}>
      <Icon size={40} className={a.text} />
      <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Aujourd'hui</p>
      <p className={`text-xl font-bold mt-0.5 ${a.text}`}>{a.label}</p>
    </div>
  )
}

function Overview() {
  const { data, isLoading, error } = useParentOverview()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: annData } = useAnnouncements()
  const [activeIdx, setActiveIdx] = useState(0)

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Spinner /></div>
  }
  if (error) {
    return <Card className="text-center py-12"><p className="text-red-600">Erreur lors du chargement des données.</p></Card>
  }

  const { children } = data

  if (!children || children.length === 0) {
    return (
      <Card className="text-center py-12">
        <GraduationCap size={40} className="text-surface-300 mx-auto mb-3" />
        <p className="text-surface-600 font-medium">Aucun enfant rattaché à votre compte</p>
        <p className="text-surface-400 text-sm mt-1">Contactez l'école pour lier vos enfants.</p>
      </Card>
    )
  }

  const child = children[Math.min(activeIdx, children.length - 1)]
  const isPaidUp = child.balance <= 0

  return (
    <div className="space-y-6 animate-fade-in">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">
          Bonjour, {user?.first_name} 👋
        </h1>
        <p className="text-surface-500 mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Sélecteur d'enfants (si plusieurs) */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-xl border transition-all ${
                i === activeIdx
                  ? 'bg-brand-50 border-brand-300 shadow-sm'
                  : 'bg-white border-surface-200 hover:border-surface-300'
              }`}
            >
              <Avatar firstName={c.firstName} lastName={c.lastName} src={c.avatarUrl} size="sm" />
              <div className="text-left">
                <p className={`text-sm font-semibold leading-tight ${i === activeIdx ? 'text-brand-700' : 'text-surface-800'}`}>
                  {c.firstName} {c.lastName}
                </p>
                <p className="text-[11px] text-surface-500">{c.className || 'Classe non définie'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Carte enfant : en-tête */}
      <Card>
        <div className="flex items-center gap-4">
          <Avatar firstName={child.firstName} lastName={child.lastName} src={child.avatarUrl} size="2xl" />
          <div>
            <h2 className="text-xl font-bold text-surface-900">{child.firstName} {child.lastName}</h2>
            <p className="text-surface-500">{child.className || 'Classe non définie'}</p>
            {child.relation && (
              <Badge variant="default" className="mt-1.5 capitalize">{child.relation}</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* 3 grands blocs : présence · notes · paiement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <AttendanceBlock status={child.attendanceToday} />

        {/* Moyenne / rang */}
        <div className="rounded-2xl border border-surface-200 bg-white p-6 flex flex-col items-center justify-center text-center">
          <Award size={40} className="text-violet-500" />
          {child.average != null ? (
            <>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Moyenne générale</p>
              <p className="text-2xl font-bold text-surface-900 mt-0.5">{child.average}/20</p>
              {child.rank != null && (
                <p className="text-sm text-surface-500 mt-1">
                  {child.rank}<sup>{child.rank === 1 ? 'er' : 'e'}</sup> sur {child.classSize}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Notes</p>
              <p className="text-base font-semibold text-surface-500 mt-1">Pas encore de notes</p>
            </>
          )}
        </div>

        {/* Solde à payer */}
        <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center ${
          isPaidUp ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
        }`}>
          <Wallet size={40} className={isPaidUp ? 'text-emerald-600' : 'text-red-600'} />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mt-3">Reste à payer</p>
          {isPaidUp ? (
            <p className="text-xl font-bold text-emerald-700 mt-0.5">À jour ✓</p>
          ) : (
            <p className="text-xl font-bold text-red-700 mt-0.5">{formatGNF(child.balance)}</p>
          )}
          <p className="text-[11px] text-surface-500 mt-1">
            Payé {formatGNF(child.totalPaid)} / {formatGNF(child.totalDue)}
          </p>
        </div>
      </div>

      {/* Paiements récents + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Historique des paiements de cet enfant */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Derniers paiements</h3>
            <CreditCard size={16} className="text-surface-400" />
          </div>
          {child.payments.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-6">Aucun paiement enregistré</p>
          ) : (
            <div className="space-y-2">
              {child.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{p.label}</p>
                    <p className="text-xs text-surface-500">
                      {new Date(p.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">+{formatGNF(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Annonces de l'école */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Annonces de l'école</h3>
            <button onClick={() => navigate('/parent/annonces')} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              Tout voir
            </button>
          </div>
          {!annData || annData.announcements.length === 0 ? (
            <div className="text-center py-6">
              <Bell size={28} className="text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-500">Aucune annonce récente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {annData.announcements.slice(0, 4).map((a) => (
                <button key={a.id} onClick={() => navigate('/parent/annonces')}
                  className="w-full text-left p-3 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors">
                  <div className="flex items-center gap-2">
                    {a.priority === 'urgent' && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    {a.priority === 'important' && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                    <p className="text-sm font-medium text-surface-900 truncate">{a.title}</p>
                    {!a.isRead && <Badge variant="primary" className="ml-auto shrink-0">Nouveau</Badge>}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">{a.body}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ParentDashboard() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="presences" element={<ParentAttendance />} />
      <Route path="resultats" element={<ParentResults />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="annonces" element={<AnnouncementsPage />} />
    </Routes>
  )
}
