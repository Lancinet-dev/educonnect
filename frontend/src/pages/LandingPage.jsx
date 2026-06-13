import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useScroll, useTransform, useInView, useMotionValue, animate,
} from 'framer-motion'
import {
  GraduationCap, Building2, LayoutDashboard, BookOpen, Users, ShieldAlert,
  ClipboardCheck, Award, MessageSquare, Wallet, Smartphone, MessageCircle,
  WifiOff, MapPin, Check, X, Menu, ArrowRight, Sparkles,
} from 'lucide-react'

const IMG = '/images/landing'
const fade = { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }

// ── Compteur animé au scroll ──────────────────────────────────
function Counter({ to, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, to, { duration: 2, ease: [0.16, 1, 0.3, 1], onUpdate: v => setVal(Math.round(v)) })
    return controls.stop
  }, [inView, to, mv])
  return <span ref={ref}>{val}{suffix}</span>
}

// ── Header ────────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [['Fonctionnalités', '#features'], ['Tarifs', '#pricing'], ['À propos', '#about']]

  return (
    <motion.header
      initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${scrolled ? 'bg-brand-600' : 'bg-white/20 backdrop-blur'}`}>
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className={`font-bold font-display text-lg ${scrolled ? 'text-surface-900' : 'text-white'}`}>EduConnect</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(([l, h]) => (
            <a key={h} href={h} className={`text-sm font-medium transition-colors ${scrolled ? 'text-surface-600 hover:text-brand-600' : 'text-white/90 hover:text-white'}`}>{l}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className={`text-sm font-semibold transition-colors ${scrolled ? 'text-surface-700 hover:text-brand-600' : 'text-white hover:text-white/80'}`}>Se connecter</Link>
          <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.98 }}>
            <Link to="/inscription" className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm">
              Créer mon école
            </Link>
          </motion.div>
        </div>

        <button onClick={() => setOpen(o => !o)} className={`md:hidden ${scrolled ? 'text-surface-700' : 'text-white'}`}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu mobile */}
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        className="md:hidden overflow-hidden bg-white border-t border-surface-100">
        <div className="px-4 py-4 space-y-3">
          {links.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block text-sm font-medium text-surface-700">{l}</a>)}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1 text-center px-4 py-2 border border-surface-200 rounded-lg text-sm font-semibold text-surface-700">Se connecter</Link>
            <Link to="/inscription" className="flex-1 text-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold">Créer mon école</Link>
          </div>
        </div>
      </motion.div>
    </motion.header>
  )
}

// ── Hero avec parallax ────────────────────────────────────────
function Hero() {
  const ref = useRef(null)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], [0, 300])     // image plus lente (0.5x)
  const overlayY = useTransform(scrollY, [0, 600], [0, 80])

  const lines = ['Digitalisez', 'votre école guinéenne']

  return (
    <section ref={ref} className="relative h-screen min-h-[640px] overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <img src={`${IMG}/hero.jpg`} alt="École en Guinée" className="w-full h-[120%] object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-surface-950/70 via-surface-950/55 to-surface-950/80" />

      <motion.div style={{ y: overlayY }} className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-center">
        <div className="max-w-3xl">
          <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-white/90 text-xs font-medium mb-5 border border-white/15">
            <Sparkles size={13} /> La plateforme scolaire de la Guinée 🇬🇳
          </motion.span>

          <h1 className="font-display font-bold text-white text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight">
            {lines.map((line, i) => (
              <motion.span key={i} className="block"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.18, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                {i === 1 ? <span className="text-brand-400">{line}</span> : line}
              </motion.span>
            ))}
          </h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg sm:text-xl text-white/80 mt-6 max-w-xl">
            Présences, notes, bulletins, paiements et communication — tout au même endroit, pensé pour les écoles d'Afrique de l'Ouest.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 mt-9">
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link to="/inscription" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg w-full sm:w-auto">
                Créer mon école gratuitement <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold rounded-xl border border-white/20 w-full sm:w-auto">
                Voir une démo
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

// ── Statistiques ──────────────────────────────────────────────
function Stats() {
  const items = [
    { value: 8, suffix: '', label: 'rôles connectés' },
    { value: 100, suffix: '%', label: 'numérique' },
    { text: 'Mobile', label: 'first' },
    { text: '🔒', label: 'Données sécurisées' },
  ]
  return (
    <section className="bg-brand-600 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
        {items.map((it, i) => (
          <motion.div key={i} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }}>
            <p className="text-4xl sm:text-5xl font-bold font-display text-white">
              {it.value != null ? <Counter to={it.value} suffix={it.suffix} /> : it.text}
            </p>
            <p className="text-brand-100 mt-1.5 text-sm font-medium">{it.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ── Pour qui ──────────────────────────────────────────────────
function Audience() {
  const roles = [
    { icon: Building2, title: 'Fondateur', desc: 'Pilotez tout votre réseau d\'écoles depuis une vue consolidée.' },
    { icon: LayoutDashboard, title: 'Directeur', desc: 'Gérez élèves, personnel, classes, finances et emploi du temps.' },
    { icon: BookOpen, title: 'Enseignant', desc: 'Faites l\'appel, saisissez les notes et donnez des devoirs en un clic.' },
    { icon: GraduationCap, title: 'Élève', desc: 'Consultez notes, devoirs, emploi du temps et bulletins.' },
    { icon: Users, title: 'Parent', desc: 'Suivez présences, résultats et paiements de vos enfants.' },
    { icon: ShieldAlert, title: 'Surveillant', desc: 'Gérez la discipline et complétez les présences au besoin.' },
  ]
  return (
    <section className="py-24 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-surface-900">Une plateforme pour chaque acteur</h2>
          <p className="text-surface-500 mt-3">Chacun son espace dédié, avec juste ce dont il a besoin.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r, i) => (
            <motion.div key={r.title}
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                <r.icon size={24} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-surface-900 text-lg">{r.title}</h3>
              <p className="text-surface-500 text-sm mt-1.5 leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Fonctionnalités (alternance) ──────────────────────────────
function Features() {
  const feats = [
    { icon: ClipboardCheck, img: 'community.jpg', title: 'Présences en temps réel', desc: 'L\'appel se fait en quelques secondes. Parents et direction voient instantanément les absences et retards, avec un historique complet et des statistiques par classe.' },
    { icon: Award, img: 'teacher.jpg', title: 'Notes & bulletins PDF', desc: 'Saisie des notes par évaluation, moyennes pondérées et rangs calculés automatiquement. Génération de bulletins PDF professionnels en un clic.' },
    { icon: MessageSquare, img: 'students.jpg', title: 'Communication instantanée', desc: 'Messagerie temps réel entre direction, enseignants et parents, plus des annonces officielles ciblées. Personne ne rate une information importante.' },
    { icon: Wallet, img: 'classroom.jpg', title: 'Finances maîtrisées', desc: 'Encaissez les frais avec reçus PDF numérotés, suivez les impayés et les dépenses, et obtenez le solde net et des rapports financiers mensuels.' },
  ]
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-surface-900">Tout ce dont votre école a besoin</h2>
          <p className="text-surface-500 mt-3">Des modules complets, intégrés et faciles à prendre en main.</p>
        </motion.div>
        <div className="space-y-20">
          {feats.map((f, i) => {
            const reversed = i % 2 === 1
            return (
              <div key={f.title} className="grid lg:grid-cols-2 gap-10 items-center">
                <motion.div
                  initial={{ opacity: 0, x: reversed ? 50 : -50 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={reversed ? 'lg:order-2' : ''}>
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                    <f.icon size={24} className="text-brand-600" />
                  </div>
                  <h3 className="text-2xl font-bold font-display text-surface-900">{f.title}</h3>
                  <p className="text-surface-600 mt-3 leading-relaxed">{f.desc}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: reversed ? -50 : 50, scale: 0.96 }} whileInView={{ opacity: 1, x: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={reversed ? 'lg:order-1' : ''}>
                  <div className="rounded-2xl overflow-hidden shadow-xl border border-surface-200 aspect-[4/3]">
                    <img src={`${IMG}/${f.img}`} alt={f.title} className="w-full h-full object-cover" />
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Pourquoi (fond sombre) ────────────────────────────────────
function Why() {
  const args = [
    { icon: MapPin, title: 'Pensé pour la Guinée', desc: 'Francs guinéens, calendrier scolaire local, écoles publiques et privées.' },
    { icon: Smartphone, title: 'Mobile Money', desc: 'Paiement des frais par Orange Money et MTN (intégration à venir).' },
    { icon: MessageCircle, title: 'Parents informés', desc: 'Notifications et annonces ; alertes SMS pour les familles bientôt.' },
    { icon: WifiOff, title: 'Léger & rapide', desc: 'Optimisé pour les connexions limitées, accessible sur tout téléphone.' },
  ]
  return (
    <section id="about" className="py-24 bg-surface-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-white">Pourquoi EduConnect</h2>
          <p className="text-surface-400 mt-3">Conçu pour le contexte réel des écoles guinéennes.</p>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {args.map((a, i) => (
            <motion.div key={a.title} {...fade} transition={{ ...fade.transition, delay: i * 0.1 }}
              className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
                <a.icon size={30} className="text-brand-400" />
              </div>
              <h3 className="font-semibold text-white text-lg">{a.title}</h3>
              <p className="text-surface-400 text-sm mt-2 leading-relaxed">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Tarifs ────────────────────────────────────────────────────
function Pricing() {
  const free = ['Jusqu\'à 3 classes', 'Présences & notes', 'Bulletins PDF', 'Messagerie & annonces', 'Devoirs & emploi du temps']
  const premium = ['Classes illimitées', 'Tout le plan Gratuit', 'Rapports financiers & académiques', 'Export CSV des impayés', 'Support prioritaire']
  return (
    <section id="pricing" className="py-24 bg-surface-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div {...fade} className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-surface-900">Des tarifs simples et transparents</h2>
          <p className="text-surface-500 mt-3">Commencez gratuitement, passez en Premium quand vous grandissez.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          {/* Gratuit */}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5 }} className="bg-white rounded-2xl border border-surface-200 p-8 shadow-sm">
            <h3 className="font-display font-bold text-xl text-surface-900">Gratuit</h3>
            <p className="text-surface-500 text-sm mt-1">Pour démarrer sereinement</p>
            <p className="mt-5"><span className="text-4xl font-bold font-display text-surface-900">0</span> <span className="text-surface-500">GNF / mois</span></p>
            <ul className="mt-6 space-y-3">
              {free.map(f => <li key={f} className="flex items-center gap-2.5 text-sm text-surface-700"><Check size={16} className="text-emerald-500 shrink-0" /> {f}</li>)}
            </ul>
            <Link to="/inscription" className="mt-7 block text-center px-5 py-2.5 border border-surface-200 rounded-xl font-semibold text-surface-700 hover:bg-surface-50">Commencer gratuitement</Link>
          </motion.div>

          {/* Premium */}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative bg-surface-900 rounded-2xl p-8 shadow-2xl md:scale-105">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-500 text-white text-xs font-semibold">
              <Sparkles size={12} /> Recommandé
            </span>
            <h3 className="font-display font-bold text-xl text-white">Premium</h3>
            <p className="text-surface-400 text-sm mt-1">Pour les écoles qui grandissent</p>
            <p className="mt-5"><span className="text-4xl font-bold font-display text-white">500 000</span> <span className="text-surface-400">GNF / mois</span></p>
            <ul className="mt-6 space-y-3">
              {premium.map(f => <li key={f} className="flex items-center gap-2.5 text-sm text-surface-200"><Check size={16} className="text-brand-400 shrink-0" /> {f}</li>)}
            </ul>
            <Link to="/inscription" className="mt-7 block text-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl font-semibold text-white">Choisir Premium</Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-surface-950 text-surface-400 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center"><GraduationCap size={20} className="text-white" /></div>
            <span className="font-bold font-display text-lg text-white">EduConnect</span>
          </div>
          <p className="text-sm max-w-xs">La plateforme scolaire tout-en-un pour digitaliser les écoles de Guinée.</p>
        </div>
        <div>
          <p className="font-semibold text-white mb-3 text-sm">Liens rapides</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-white">Fonctionnalités</a></li>
            <li><a href="#pricing" className="hover:text-white">Tarifs</a></li>
            <li><Link to="/login" className="hover:text-white">Se connecter</Link></li>
            <li><Link to="/inscription" className="hover:text-white">Créer mon école</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-3 text-sm">Contact</p>
          <p className="text-sm">contact@educonnect.gn</p>
          <p className="text-sm mt-1">Conakry, Guinée</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-surface-800 text-center text-sm">
        © 2026 EduConnect · Conakry, Guinée 🇬🇳
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="bg-white">
      <Header />
      <Hero />
      <Stats />
      <Audience />
      <Features />
      <Why />
      <Pricing />
      <Footer />
    </div>
  )
}
