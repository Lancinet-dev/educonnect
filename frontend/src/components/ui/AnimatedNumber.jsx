import { useEffect } from 'react'
import { useMotionValue, useTransform, animate, motion } from 'framer-motion'

// Compteur animé : le nombre monte progressivement à l'affichage.
export default function AnimatedNumber({ value, duration = 0.9, className = '' }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('fr-FR'))

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return controls.stop
  }, [value, duration, mv])

  return <motion.span className={className}>{text}</motion.span>
}
