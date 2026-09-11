import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Close } from '@mui/icons-material'

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose} />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={  { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className={`relative w-full ${SIZE_MAP[size] || SIZE_MAP.md} bg-white rounded shadow-gov-lg z-10`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-800">{title}</h3>
              <button onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded p-1 transition-colors">
                <Close fontSize="small" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 overflow-y-auto max-h-[70vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
