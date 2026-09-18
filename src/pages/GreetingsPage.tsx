import { useEffect, useState } from 'react'
import { Check, Loader2, PartyPopper, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Greeting } from '../lib/types'
import { getLocalGreetingsForPerson, getLocalGreetingsForReceiver, getLocalPeople, updateLocalGreetingStatus } from '../lib/localStore'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function GreetingsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Greeting[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  const fetchItems = async () => {
    setLoading(true)
    const selfPerson = getLocalPeople(user!.id).find(p => p.name === 'خودم')
    const received = getLocalGreetingsForReceiver(user!.id)
    const selfReceived = selfPerson ? getLocalGreetingsForPerson(selfPerson.id) : []
    const local = [...received, ...selfReceived.filter(g => !received.some(r => r.id === g.id))]
    if (user!.id.startsWith('local-')) {
      setItems(local)
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('greetings')
        .select('*')
        .eq('receiver_user_id', user!.id)
        .order('created_at', { ascending: false })
      setItems(data && data.length > 0 ? data : local)
    } catch {
      setItems(local)
    } finally {
      setLoading(false)
    }
  }

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdating(id)
    updateLocalGreetingStatus(id, status)
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('greetings').update({
          status,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      } catch {
        // local fallback
      }
    }
    setUpdating(null)
    fetchItems()
  }

  const pending = items.filter(i => i.status === 'pending')
  const approved = items.filter(i => i.status === 'approved')

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title="پیام‌های تبریک" subtitle={`${items.length} پیام`} back />

      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<PartyPopper size={32} />}
            title="پیام تبریکی ندارید"
            description="وقتی کسی برای شما تبریک بفرستد، اینجا نمایش داده می‌شود"
          />
        ) : (
          <>
            {pending.length > 0 && (
              <section>
                <h3 className="font-bold text-stone-800 mb-3">در انتظار تأیید</h3>
                <div className="space-y-2">
                  {pending.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-stone-100 p-4">
                      <p className="text-sm font-semibold text-stone-800">{item.sender_name}</p>
                      {item.occasion_title && (
                        <p className="text-xs text-stone-400 mt-0.5">{item.occasion_title}</p>
                      )}
                      <p className="text-sm text-stone-600 mt-2 leading-6">{item.message}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setStatus(item.id, 'approved')}
                          disabled={updating === item.id}
                          className="flex-1 py-2 rounded-xl bg-success-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Check size={16} /> تأیید
                        </button>
                        <button
                          onClick={() => setStatus(item.id, 'rejected')}
                          disabled={updating === item.id}
                          className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <X size={16} /> رد
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {approved.length > 0 && (
              <section>
                <h3 className="font-bold text-stone-800 mb-3">تبریک‌های نمایش‌داده‌شده</h3>
                <div className="space-y-2">
                  {approved.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-stone-100 p-4">
                      <p className="text-sm font-semibold text-stone-800">{item.sender_name}</p>
                      {item.occasion_title && (
                        <p className="text-xs text-stone-400 mt-0.5">{item.occasion_title}</p>
                      )}
                      <p className="text-sm text-stone-600 mt-2 leading-6">{item.message}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
