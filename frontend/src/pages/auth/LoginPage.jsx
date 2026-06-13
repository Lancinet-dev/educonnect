import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, GraduationCap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Veuillez saisir votre email.')
      return
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe.')
      return
    }

    try {
      await login({ email, password })
    } catch (err) {
      setError(err?.response?.data?.error || 'Connexion impossible. Vérifiez vos identifiants.')
    }
  }

  return (
    <div className="min-h-screen aurora-bg relative flex flex-col items-center justify-center p-4 overflow-hidden">

      {/* Formes flottantes animées */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-brand-400/20 blur-3xl animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-secondary-500/15 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-sky-400/15 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">

        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-600 to-secondary-600
                          rounded-2xl shadow-glow mb-4">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display text-surface-900">
            EduConnect
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            La plateforme scolaire de la Guinée
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-lg p-8">
          <h2 className="text-lg font-semibold text-surface-900 mb-6">
            Connexion à votre espace
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@ecole.gn"
                  autoComplete="email"
                  className="input pl-9"
                  disabled={isLoggingIn}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-surface-700">
                  Mot de passe
                </label>
                <a
                  href="#"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input pl-9 pr-10"
                  disabled={isLoggingIn}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-surface-400 hover:text-surface-600 transition-colors"
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200
                              rounded-lg text-sm text-red-700 animate-fade-in">
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Inscription nouvelle école */}
          <div className="mt-5 pt-5 border-t border-surface-100 text-center">
            <p className="text-sm text-surface-500">
              Votre école n'est pas encore inscrite ?
            </p>
            <Link to="/inscription" className="inline-block mt-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Créer mon école →
            </Link>
          </div>
        </div>

        {/* Comptes de démo */}
        <div className="mt-4 p-4 bg-white rounded-xl border border-surface-200 shadow-sm">
          <p className="text-xs font-medium text-surface-500 mb-3 uppercase tracking-wide">
            Comptes de démonstration
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'Super Admin',  email: 'admin@educonnect.gn' },
              { role: 'Fondateur',    email: 'fondateur@cec.gn' },
              { role: 'Directrice',   email: 'directrice@cec.gn' },
              { role: 'Comptable',    email: 'comptable@cec.gn' },
              { role: 'Surveillant',  email: 'surveillant@cec.gn' },
              { role: 'Enseignant',   email: 'enseignant@cec.gn' },
              { role: 'Parent',       email: 'parent@cec.gn' },
              { role: 'Élève',        email: 'eleve@cec.gn' },
            ].map(({ role, email: demoEmail }) => (
              <button
                key={demoEmail}
                type="button"
                onClick={() => {
                  setEmail(demoEmail)
                  setPassword('Admin123!')
                  setError('')
                }}
                className="text-left p-2.5 rounded-lg border border-surface-200
                           hover:border-brand-300 hover:bg-brand-50
                           transition-all duration-150 group"
              >
                <p className="text-xs font-semibold text-surface-700 group-hover:text-brand-700">
                  {role}
                </p>
                <p className="text-[10px] text-surface-400 truncate mt-0.5">
                  {demoEmail}
                </p>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-surface-400 mt-2 text-center">
            Mot de passe : <span className="font-mono font-medium">Admin123!</span>
          </p>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          © 2025 EduConnect · Conakry, Guinée 🇬🇳
        </p>
      </div>
    </div>
  )
}
