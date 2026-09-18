import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function InvitePage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (session) {
      navigate('/discover', { replace: true })
      return
    }
    navigate('/login?next=/discover', { replace: true })
  }, [session, loading, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary-50 to-white">
      <Gift size={40} className="text-primary-500 mb-4" />
      <p className="text-stone-600 text-sm mb-3">بگو چی دوست داری کادو بگیری؟</p>
      <Loader2 size={22} className="animate-spin text-stone-400" />
    </div>
  )
}
