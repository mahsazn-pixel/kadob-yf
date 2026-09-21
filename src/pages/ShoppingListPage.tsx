import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Loader2, Check, Gift, X, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ShoppingListItem, formatPrice } from '../lib/types'
import { getLocalShoppingItems, updateLocalShoppingItem, deleteLocalShoppingItem, markGiftGiven, setLocalWishlistHold } from '../lib/localStore'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

type Tab = 'all' | 'reserved' | 'purchased' | 'gifted'

export default function ShoppingListPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  const fetchItems = async () => {
    setLoading(true)
    const local = getLocalShoppingItems(user!.id)
    if (user!.id.startsWith('local-')) {
      setItems(local)
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('shopping_list_items')
        .select('*, product:products(*), receiver:close_people(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      setItems(data && data.length > 0 ? data : local)
    } catch {
      setItems(local)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: 'purchased' | 'gifted') => {
    setUpdating(id)
    const updates: Partial<{ status: string; purchased_at: string; gifted_at: string }> = { status }
    if (status === 'purchased') updates.purchased_at = new Date().toISOString()
    if (status === 'gifted') updates.gifted_at = new Date().toISOString()
    updateLocalShoppingItem(id, updates)
    if (status === 'gifted') {
      const current = items.find(item => item.id === id)
      if (current) {
        markGiftGiven({
          giver_user_id: user!.id,
          giver_name: profile?.name || 'یک کاربر',
          receiver_person_id: current.receiver_id,
          receiver_user_id: current.receiver?.linked_user_id,
          product_id: current.product_id,
          product: current.product,
          shopping_item_id: current.id,
        })
        const receiverUserId = current.receiver?.linked_user_id
          || (current.receiver?.name === 'خودم' ? current.receiver.owner_user_id : null)
        if (!user!.id.startsWith('local-') && receiverUserId) {
          try {
            await supabase.from('wishlist_items').delete().eq('owner_user_id', receiverUserId).eq('product_id', current.product_id)
          } catch {
            // local fallback
          }
        }
      }
    }
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('shopping_list_items').update({
          ...updates,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      } catch {
        // local fallback
      }
    }
    setUpdating(null)
    fetchItems()
  }

  const cancelReservation = async (id: string) => {
    setUpdating(id)
    const current = items.find(item => item.id === id)
    deleteLocalShoppingItem(id)
    const receiverUserId = current?.receiver?.linked_user_id
      || (current?.receiver?.name === 'خودم' ? current.receiver.owner_user_id : null)
    if (current && receiverUserId) {
      setLocalWishlistHold(receiverUserId, current.product_id, null)
      if (!user!.id.startsWith('local-')) {
        try {
          await supabase.from('wishlist_items').update({
            reserved_by_user_id: null,
            reserved_at: null,
          }).eq('owner_user_id', receiverUserId).eq('product_id', current.product_id)
        } catch {
          // local fallback
        }
      }
    }
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('shopping_list_items').delete().eq('id', id)
      } catch {
        // local fallback
      }
    }
    setUpdating(null)
    fetchItems()
  }

  const filteredItems = items.filter(item => tab === 'all' || item.status === tab)

  const counts = {
    all: items.length,
    reserved: items.filter(i => i.status === 'reserved').length,
    purchased: items.filter(i => i.status === 'purchased').length,
    gifted: items.filter(i => i.status === 'gifted').length,
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title="لیست خرید" subtitle={`${items.length} کادو`} back />

      <div className="px-4 py-3">
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {([
            { v: 'all', l: 'همه', c: counts.all },
            { v: 'reserved', l: 'رزرو شده', c: counts.reserved },
            { v: 'purchased', l: 'خریدم', c: counts.purchased },
            { v: 'gifted', l: 'هدیه دادم', c: counts.gifted },
          ] as { v: Tab; l: string; c: number }[]).map(t => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.v ? 'bg-primary-500 text-white' : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              {t.l} {t.c > 0 && <span className="opacity-70">({t.c})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={32} />}
            title="لیست خرید خالی است"
            description="با کشف هدیه، محصولات به اینجا اضافه می‌شوند"
            action={
              <button
                onClick={() => navigate('/discover')}
                className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
              >
                شروع کشف هدیه
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                <div className="flex gap-3 p-3">
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 text-sm line-clamp-2">{item.product?.title}</p>
                    <p className="text-sm text-primary-600 font-bold mt-0.5">
                      {item.product ? formatPrice(item.product.price_amount) : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'reserved' ? 'bg-error-100 text-error-700' :
                        item.status === 'purchased' ? 'bg-secondary-100 text-secondary-700' :
                        'bg-success-100 text-success-700'
                      }`}>
                        {item.status === 'reserved' ? 'رزرو شده' : item.status === 'purchased' ? 'خریدم' : 'هدیه دادم'}
                      </span>
                      {item.receiver && (
                        <span className="text-xs text-stone-400">برای {item.receiver.name}</span>
                      )}
                    </div>
                  </div>
                  {updating === item.id && <Loader2 size={20} className="animate-spin text-stone-400 shrink-0" />}
                </div>

                <div className="flex border-t border-stone-100">
                  {item.status === 'reserved' && (
                    <>
                      {item.product?.shop_url && (
                        <a
                          href={item.product.shop_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag size={16} /> خرید
                        </a>
                      )}
                      <button
                        onClick={() => updateStatus(item.id, 'purchased')}
                        className="flex-1 py-2.5 text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors flex items-center justify-center gap-1.5 border-r border-stone-100"
                      >
                        <Check size={16} /> خریدم
                      </button>
                      <button
                        onClick={() => cancelReservation(item.id)}
                        className="flex-1 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 transition-colors flex items-center justify-center gap-1.5 border-r border-stone-100"
                      >
                        <X size={16} /> لغو رزرو
                      </button>
                    </>
                  )}
                  {item.status === 'purchased' && (
                    <>
                      <button
                        onClick={() => updateStatus(item.id, 'gifted')}
                        className="flex-1 py-2.5 text-sm font-medium text-success-600 hover:bg-success-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Gift size={16} /> هدیه دادم
                      </button>
                    </>
                  )}
                  {item.status === 'gifted' && (
                    <div className="flex-1 py-2.5 text-sm text-success-600 font-medium flex items-center justify-center gap-1.5">
                      <Check size={16} /> تکمیل شد
                    </div>
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
