import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-4 text-stone-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-stone-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-500 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
