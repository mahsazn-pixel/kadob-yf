import { useEffect, useState } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Notification } from '../lib/types'
import { confirmLocalReceivedGift, getLocalNotifications, getLocalReceivedGifts, updateLocalNotification } from '../lib/localStore'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setItems(getLocalNotifications(user.id))
    setLoading(false)
  }, [user])

  const confirmGift = (item: Notification) => {
    const giftId = String(item.payload_json.received_gift_id || '')
    const productId = String(item.payload_json.product_id || '')
    setUpdating(item.id)
    if (giftId) {
      confirmLocalReceivedGift(giftId)
    } else if (user && productId) {
      const match = getLocalReceivedGifts(user.id).find(g => g.product_id === productId && !g.confirmed)
      if (match) confirmLocalReceivedGift(match.id)
    }
    updateLocalNotification(item.id, {
      status: 'read',
      payload_json: { ...item.payload_json, confirmed: true },
    })
    if (user) setItems(getLocalNotifications(user.id))
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title="اعلان‌ها" back />
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} />}
            title="اعلانی ندارید"
            description="وقتی کسی برای شما هدیه بفرستد، اینجا نمایش داده می‌شود"
          />
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const giver = String(item.payload_json.giver_name || 'یک کاربر')
              const productTitle = String(item.payload_json.product_title || 'یک آیتم')
              const confirmed = !!item.payload_json.confirmed
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-stone-100 p-4">
                  <p className="text-sm text-stone-700 leading-7">
                    کاربر {giver} آیتم {productTitle} را به شما هدیه داده است
                  </p>
                  <div className="mt-3 flex justify-end">
                    {confirmed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success-700 bg-success-50 px-3 py-1.5 rounded-full">
                        <Check size={14} /> تأیید شد
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmGift(item)}
                        disabled={updating === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        {updating === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        تأیید
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
