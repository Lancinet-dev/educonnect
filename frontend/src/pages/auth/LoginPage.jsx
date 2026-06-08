import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.')
      return
    }
    login(
      { email, password },
      { onError: (err) => setError(err.response?.data?.error || 'Connexion impossible.') }
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Carte de connexion */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-1">
            <span className="font-display font-bold text-2xl text-brand-600">EduConnect</span>
          </div>
          <p className="text-center text-sm text-surface-500 mb-7">
            La plateforme scolaire de la Guinée
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="vous@ecole.gn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-700">
                Mot de passe<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full py-2 pl-9 pr-9 bg-white border border-surface-200 hover:border-surface-300
                             rounded-lg text-sm text-surface-900 placeholder:text-surface-400 shadow-inner
                             transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500
                             focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors duration-150"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={isLoggingIn} className="w-full mt-1">
              Se connecter
            </Button>
          </form>

          <div className="text-center mt-5">
            <a href="#" className="text-sm text-surface-500 hover:text-brand-600 transition-colors duration-150">
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-surface-400 mt-6">
          © 2025 EduConnect · Conakry, Guinée
        </p>
      </div>
    </div>
  )
}
