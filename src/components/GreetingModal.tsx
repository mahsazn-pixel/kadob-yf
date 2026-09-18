import { useState } from 'react'
import { Loader2, PartyPopper, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson } from '../lib/types'
import { createLocalGreeting } from '../lib/localStore'

interface GreetingModalProps {
  person: ClosePerson
  occasionId?: string | null
  occasionTitle?: string | null
  onClose: () => void
  onSent?: () => void
}

export default function GreetingModal({ person, occasionId, occasionTitle, onClose, onSent }: GreetingModalProps) {
  const { user, profile } = useAuth()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!user || !message.trim()) return
    setSaving(true)
    const payload = {
      sender_user_id: user.id,
      sender_name: profile?.name || 'کاربر کادوبا',
      receiver_person_id: person.id,
      receiver_user_id: person.linked_user_id || (person.name === 'خودم' ? user.id : null),
      occasion_id: occasionId || null,
      occasion_title: occasionTitle || null,
      message: message.trim(),
      status: 'pending' as const,
    }
    createLocalGreeting(payload)
    if (!user.id.startsWith('local-')) {
      try {
        await supabase.from('greetings').insert(payload)
      } catch {
        // local fallback
      }
    }
    setSaving(false)
    setSent(true)
    onSent?.()
  }

  return (
    <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <PartyPopper size={18} className="text-error-500" />
            تبریک برای {person.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100">
            <X size={20} className="text-stone-500" />
          </button>
        </div>
        {sent ? (
          <div className="text-center py-6">
            <p className="font-semibold text-stone-800 mb-1">پیام تبریک ارسال شد</p>
            <p className="text-sm text-stone-500 mb-4">پس از تأیید مخاطب، در صفحه او نمایش داده می‌شود.</p>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium">
              باشه
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {occasionTitle && (
              <p className="text-xs text-stone-500">مناسبت: {occasionTitle}</p>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="پیام تبریک خود را بنویسید..."
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={saving || !message.trim()}
              className="w-full py-3.5 rounded-xl bg-error-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : 'ارسال تبریک'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
