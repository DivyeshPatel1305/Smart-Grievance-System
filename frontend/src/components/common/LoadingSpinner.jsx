export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 border-4 border-neutral-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  )
}

export default function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-5 h-5 border-2' : size === 'lg' ? 'w-12 h-12 border-4' : 'w-8 h-8 border-3'
  return <div className={`${s} border-neutral-200 border-t-primary-600 rounded-full animate-spin`} />
}
