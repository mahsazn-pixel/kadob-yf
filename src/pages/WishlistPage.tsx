import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { WishlistItem, formatPrice } from '../lib/types'
import { getLocalWishlist } from '../lib/localStore'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function WishlistPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  const fetchItems = async () => {
    setLoading(true)
    const local = getLocalWishlist(user!.id)
    if (user!.id.startsWith('local-')) {
      setItems(local)
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('wishlist_items')
        .select('*, product:products(*)')
        .eq('owner_user_id', user!.id)
        .order('created_at', { ascending: false })
      setItems(data && data.length > 0 ? data : local)
    } catch {
      setItems(local)
    } finally {
      setLoading(false)
    }
  }

  const removeFromWishlist = async (id: string) => {
    await supabase.from('wishlist_items').delete().eq('id', id)
    fetchItems()
  }

  const toggleVisibility = async (item: WishlistItem) => {
    const newVisibility = item.visibility === 'public' ? 'private' : 'public'
    await supabase.from('wishlist_items').update({ visibility: newVisibility }).eq('id', item.id)
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader
        title="لیست آرزوها"
        subtitle={`${items.length} مورد`}
      />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart size={32} />}
            title="هنوز هیچ آیتمی را به لیست خواسته‌های خود اضافه نکرده‌اید"
            action={
              <button
                onClick={() => navigate('/discover')}
                className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
              >
                یافتن آیتم دلخواه
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => {
              const shopUrl = item.product?.shop_url
              const ProductBody = (
                <>
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-stone-800 line-clamp-2 mb-1">{item.product?.title}</p>
                    <p className="text-sm text-primary-600 font-bold">
                      {item.product ? formatPrice(item.product.price_amount) : ''}
                    </p>
                  </div>
                </>
              )
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                  {shopUrl ? (
                    <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="block">
                      {ProductBody}
                    </a>
                  ) : ProductBody}
                  <div className="px-2.5 pb-2.5 flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleVisibility(item)}
                      className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
                      title={item.visibility === 'public' ? 'عمومی' : 'خصوصی'}
                    >
                      {item.visibility === 'public' ? (
                        <Eye size={16} className="text-success-500" />
                      ) : (
                        <EyeOff size={16} className="text-stone-400" />
                      )}
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:bg-error-50 hover:text-error-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
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
