import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Home } from '@mui/icons-material'

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-red-500" style={{ fontSize: 40 }} />
        </div>
        <p className="text-6xl font-extrabold text-red-500">403</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
          You don't have permission to access this page.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-6">
          <Home fontSize="small" /> Go Home
        </Link>
      </motion.div>
    </div>
  )
}
