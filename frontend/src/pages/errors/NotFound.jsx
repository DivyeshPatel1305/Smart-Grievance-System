import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home } from '@mui/icons-material'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-8xl font-extrabold text-primary-600 dark:text-primary-400">404</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">Page Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-6">
          <Home fontSize="small" /> Go Home
        </Link>
      </motion.div>
    </div>
  )
}
