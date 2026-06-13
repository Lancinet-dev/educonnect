import { AnimatePresence, motion } from 'framer-motion'

// Conteneur de modale animé (scale + fade). Usage :
//   <Modal open={open} onClose={...}><div className="...panel...">…</div></Modal>
export default function Modal({ open, onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className={`bg-white rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-xl`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
