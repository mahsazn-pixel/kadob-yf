import { useEffect, useState } from 'react'
import { Gift, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ReceivedGift, formatPrice } from '../lib/types'
import { confirmLocalReceivedGift, getLocalReceivedGifts } from '../lib/localStore'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function ReceivedGiftsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<ReceivedGift[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setItems(getLocalReceivedGifts(user.id))
    setLoading(false)
  }, [user])

  const confirmGift = (id: string) => {
    setUpdating(id)
    confirmLocalReceivedGift(id)
    if (user) setItems(getLocalReceivedGifts(user.id))
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title="هدیه‌های دریافتی" subtitle={`${items.length} مورد`} back />
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Gift size={32} />}
            title="هدیه‌ای دریافت نشده"
            description="وقتی کسی آیتمی از لیست خواسته‌های شما را هدیه بدهد، اینجا نمایش داده می‌شود"
          />
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                <div className="flex gap-3 p-3">
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 line-clamp-2">{item.product?.title}</p>
                    <p className="text-xs text-stone-500 mt-1">از طرف {item.giver_name}</p>
                    {item.product && (
                      <p className="text-sm text-primary-600 font-bold mt-1">{formatPrice(item.product.price_amount)}</p>
                    )}
                  </div>
                </div>
                <div className="border-t border-stone-100">
                  {item.confirmed ? (
                    <div className="py-2.5 text-sm font-medium text-success-600 flex items-center justify-center gap-1.5">
                      <Check size={16} /> تأیید شد
                    </div>
                  ) : (
                    <button
                      onClick={() => confirmGift(item.id)}
                      disabled={updating === item.id}
                      className="w-full py-2.5 text-sm font-medium text-success-600 hover:bg-success-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {updating === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      تأیید دریافت
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
