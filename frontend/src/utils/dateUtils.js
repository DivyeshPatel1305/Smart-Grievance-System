import { format as fnsFormat } from 'date-fns'

/**
 * Safe wrapper around date-fns format().
 * Returns fallback string if date is null/undefined/invalid.
 */
export function safeFormat(date, formatStr, fallback = 'N/A') {
  try {
    if (!date) return fallback
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    if (isNaN(d.getTime())) return fallback
    return fnsFormat(d, formatStr)
  } catch {
    return fallback
  }
}
