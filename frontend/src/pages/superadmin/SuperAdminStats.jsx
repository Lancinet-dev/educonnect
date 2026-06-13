import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { Activity, Users } from 'lucide-react'
import { useSuperAdminStats } from '@/hooks/useSuperAdminData'
import StatCard from '@/components/ui/StatCard'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

const ROLE_LABEL = {
  super_admin: 'Super Admin', founder: 'Fondateur', school_admin: 'Directeur',
  accountant: 'Comptable', surveillant: 'Surveillant', teacher: 'Enseignant',
  student: 'Élève', parent: 'Parent',
}
const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#cbd5e1']

export default function SuperAdminStats() {
  const { data, isLoading } = useSuperAdminStats()
  if (isLoading || !data) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  const roleData = data.usersByRole.map((r, i) => ({ name: ROLE_LABEL[r.role] || r.role, value: r.total, color: COLORS[i % COLORS.length] }))
  const activePct = data.activity.total ? Math.round((data.activity.active30 / data.activity.total) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Statistiques</h1>
        <p className="text-surface-500 mt-1">Usage global de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Utilisateurs totaux" value={data.activity.total} icon={Users} color="brand" />
        <StatCard label="Actifs (7 jours)" value={data.activity.active7} icon={Activity} color="green" />
        <StatCard label="Actifs (30 jours)" value={`${data.activity.active30} (${activePct}%)`} icon={Activity} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Croissance des écoles (6 mois)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.schoolsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 13, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
              <Bar dataKey="total" name="Écoles" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-surface-900 mb-4">Croissance des élèves (6 mois)</h3>
          {data.studentsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.studentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 13, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
                <Line type="monotone" dataKey="total" name="Élèves" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-60 flex items-center justify-center text-surface-400 text-sm">Pas encore de données</div>}
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-surface-900 mb-4">Répartition des utilisateurs par rôle</h3>
        <div className="flex items-center gap-6 flex-wrap">
          <ResponsiveContainer width="45%" height={220}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {roleData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 13, boxShadow: '0 12px 32px rgba(0,0,0,0.08)', padding: '8px 12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 grid grid-cols-2 gap-2 min-w-[200px]">
            {roleData.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                <span className="text-sm text-surface-600 flex-1">{r.name}</span>
                <span className="text-sm font-semibold text-surface-900">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
