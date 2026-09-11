/**
 * Shared wrapper for all auth pages — government style header + tricolor bar.
 */
import { Link } from 'react-router-dom'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Top utility bar */}
      <div className="gov-strip text-xs">
        <span>Government of India &nbsp;|&nbsp; भारत सरकार</span>
      </div>

      {/* Gov Header */}
      <header className="gov-header">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">GOV</span>
          </div>
          <div>
            <Link to="/" className="text-base font-bold text-primary-700 hover:text-primary-800 transition-colors leading-tight block">
              Smart Grievance Portal
            </Link>
            <p className="text-xs text-neutral-500">Government of India</p>
          </div>
        </div>
        <div className="tricolor-bar" />
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Page title */}
          {title && (
            <div className="mb-4 text-center">
              <h1 className="text-xl font-bold text-primary-700">{title}</h1>
              {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
            </div>
          )}

          {/* Card */}
          <div className="bg-white border border-neutral-200 rounded shadow-gov">
            {/* Top accent */}
            <div className="h-1 bg-primary-600 rounded-t" />
            <div className="p-6 sm:p-8">
              {children}
            </div>
          </div>

          <p className="text-center text-xs text-neutral-400 mt-4">
            © {new Date().getFullYear()} Government of India &nbsp;|&nbsp;
            <Link to="/" className="hover:text-primary-600">Home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
