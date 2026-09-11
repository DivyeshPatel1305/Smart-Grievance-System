const COLOR_MAP = {
  blue:   'bg-blue-50 text-blue-600 border-blue-200',
  green:  'bg-green-50 text-green-600 border-green-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red:    'bg-red-50 text-red-600 border-red-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
}

export default function StatsCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.blue
  return (
    <div className="bg-white border border-neutral-200 rounded shadow-gov p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded border flex items-center justify-center flex-shrink-0 ${cls}`}>
        {Icon && <Icon fontSize="small" />}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-neutral-800 leading-tight">
          {value ?? '—'}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{title}</p>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
