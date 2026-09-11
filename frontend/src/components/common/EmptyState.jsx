export default function EmptyState({ title = 'No data found', description, action, icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4 opacity-60">{icon}</span>
      <h3 className="text-base font-semibold text-neutral-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-400 mb-4 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
