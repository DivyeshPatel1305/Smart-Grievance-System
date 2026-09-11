const STATUS_CLASSES = {
  submitted:            'bg-blue-100 text-blue-800',
  verified:             'bg-cyan-100 text-cyan-800',
  assigned:             'bg-purple-100 text-purple-800',
  accepted:             'bg-indigo-100 text-indigo-800',
  work_started:         'bg-yellow-100 text-yellow-800',
  in_progress:          'bg-orange-100 text-orange-800',
  resolved:             'bg-green-100 text-green-800',
  citizen_verification: 'bg-teal-100 text-teal-800',
  closed:               'bg-neutral-100 text-neutral-700',
  rejected:             'bg-red-100 text-red-800',
  reopened:             'bg-pink-100 text-pink-800',
}

const PRIORITY_CLASSES = {
  low:       'bg-green-100 text-green-800',
  medium:    'bg-yellow-100 text-yellow-800',
  high:      'bg-orange-100 text-orange-800',
  emergency: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }) {
  const cls = STATUS_CLASSES[status] || 'bg-neutral-100 text-neutral-700'
  const label = (status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return <span className={`badge ${cls}`}>{label}</span>
}

export function PriorityBadge({ priority }) {
  const cls = PRIORITY_CLASSES[priority] || 'bg-neutral-100 text-neutral-700'
  const label = (priority || '').charAt(0).toUpperCase() + (priority || '').slice(1)
  return <span className={`badge ${cls}`}>{label}</span>
}
