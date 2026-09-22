import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Loader2, Check, Gift, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, ShoppingListItem, closenessLabel, formatPrice } from '../lib/types'
import { getLocalPeople, getLocalShoppingItems, updateLocalShoppingItem, deleteLocalShoppingItem, markGiftGiven, setLocalWishlistHold } from '../lib/localStore'
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
  const [people, setPeople] = useState<ClosePerson[]>([])
  const [giftTargetId, setGiftTargetId] = useState<string | null>(null)
  const [giftReceiverId, setGiftReceiverId] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    if (user) {
      fetchItems()
      void fetchPeople()
    }
  }, [user])

  const fetchPeople = async () => {
    const local = getLocalPeople(user!.id)
    if (user!.id.startsWith('local-')) {
      setPeople(local)
      return
    }
    try {
      const { data } = await supabase
        .from('close_people')
        .select('*')
        .eq('owner_user_id', user!.id)
        .order('created_at', { ascending: false })
      setPeople(data && data.length > 0 ? data : local)
    } catch {
      setPeople(local)
    }
  }

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

  const updateStatus = async (id: string, status: 'purchased' | 'gifted', receiverOverride?: ClosePerson | null) => {
    setUpdating(id)
    const current = items.find(item => item.id === id)
    const receiver = receiverOverride || current?.receiver || null
    const updates: Partial<ShoppingListItem> = { status }
    if (status === 'purchased') updates.purchased_at = new Date().toISOString()
    if (status === 'gifted') {
      updates.gifted_at = new Date().toISOString()
      if (receiver) {
        updates.receiver_id = receiver.id
        updates.receiver = receiver
      }
    }
    updateLocalShoppingItem(id, updates)
    if (status === 'gifted' && current && receiver) {
      markGiftGiven({
        giver_user_id: user!.id,
        giver_name: profile?.name || 'یک کاربر',
        receiver_person_id: receiver.id,
        receiver_user_id: receiver.linked_user_id,
        product_id: current.product_id,
        product: current.product,
        shopping_item_id: current.id,
      })
      const receiverUserId = receiver.linked_user_id
        || (receiver.name === 'خودم' ? receiver.owner_user_id : null)
      if (!user!.id.startsWith('local-') && receiverUserId) {
        try {
          await supabase.from('wishlist_items').delete().eq('owner_user_id', receiverUserId).eq('product_id', current.product_id)
        } catch {
          // local fallback
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
    setGiftTargetId(null)
    setGiftReceiverId('')
    fetchItems()
  }

  const openGiftPicker = (item: ShoppingListItem) => {
    setGiftTargetId(item.id)
    setGiftReceiverId(item.receiver_id || '')
  }

  const confirmGiftPerson = () => {
    if (!giftTargetId) return
    const receiver = people.find(p => p.id === giftReceiverId)
    if (!receiver) {
      setToastMsg('یک نفر را انتخاب کنید')
      setTimeout(() => setToastMsg(''), 2500)
      return
    }
    void updateStatus(giftTargetId, 'gifted', receiver)
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
                      {item.receiver ? (
                        <span className="text-xs text-stone-400">
                          برای{' '}
                          {item.receiver.name === 'خودم' ? (
                            <Link to="/profile" className="text-primary-600 hover:underline">
                              {item.receiver.name}
                            </Link>
                          ) : item.receiver.linked_user_id ? (
                            <Link to={`/people/${item.receiver.id}`} className="text-primary-600 hover:underline">
                              {item.receiver.name}
                            </Link>
                          ) : (
                            item.receiver.name
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">بدون شخص</span>
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
                        onClick={() => openGiftPicker(item)}
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

      {giftTargetId && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[60] flex items-end justify-center" onClick={() => { setGiftTargetId(null); setGiftReceiverId('') }}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">به چه شخصی؟</h2>
              <button type="button" onClick={() => { setGiftTargetId(null); setGiftReceiverId('') }} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">هدیه به نام این شخص ثبت می‌شود</p>
            <select
              value={giftReceiverId}
              onChange={(e) => setGiftReceiverId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white mb-4"
            >
              <option value="">یک نفر را انتخاب کنید</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.name === 'خودم' ? '' : ` (${closenessLabel(p.closeness)})`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={confirmGiftPerson}
              disabled={updating === giftTargetId}
              className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all"
            >
              ثبت هدیه
            </button>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-50 px-5 flex justify-center pointer-events-none">
          <div className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium shadow-lg animate-slide-up">
            {toastMsg}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
