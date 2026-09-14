import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, back, action }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header
      className="sticky top-0 z-40 border-b border-primary-600 px-4 py-3 shadow-md"
      style={{
        background: `
          linear-gradient(160deg, rgba(255,255,255,0.14) 0%, transparent 45%, rgba(0,0,0,0.06) 100%),
          linear-gradient(160deg, #d0b893 0%, #C5A880 45%, #b8966a 100%)
        `,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {back && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -mr-1.5 rounded-lg hover:bg-black/10 transition-colors shrink-0"
            >
              <ChevronRight size={22} className="text-white" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{title}</h1>
            {subtitle && <p className="text-xs text-white/80 truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
