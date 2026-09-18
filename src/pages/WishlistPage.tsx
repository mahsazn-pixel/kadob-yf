import { useEffect, useState } from 'react'
import { Heart, Loader2, Trash2, Search, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { WishlistItem, Product, formatPrice } from '../lib/types'
import { getLocalWishlist, addLocalWishlistItem } from '../lib/localStore'
import { LOCAL_PRODUCTS } from '../lib/catalog'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function WishlistPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    const q = searchQuery.trim()
    const localMatches = LOCAL_PRODUCTS.filter(p => p.title.includes(q)).slice(0, 20)
    if (user!.id.startsWith('local-')) {
      setProducts(localMatches)
      setSearching(false)
      return
    }
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('title', `%${q}%`)
        .limit(20)
      setProducts(data && data.length > 0 ? data : localMatches)
    } catch {
      setProducts(localMatches)
    } finally {
      setSearching(false)
    }
  }

  const addToWishlist = async (product: Product) => {
    if (user!.id.startsWith('local-')) {
      addLocalWishlistItem(user!.id, product.id)
    } else {
      try {
        await supabase.from('wishlist_items').insert({
          owner_user_id: user!.id,
          product_id: product.id,
        })
      } catch {
        addLocalWishlistItem(user!.id, product.id)
      }
    }
    setShowSearch(false)
    setSearchQuery('')
    setProducts([])
    fetchItems()
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
        action={
          <button
            onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
          >
            <Search size={18} />
          </button>
        }
      />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart size={32} />}
            title="لیست آرزوها خالی است"
            description="چیزهایی که دوست داری به این لیست اضافه کن"
            action={
              <button
                onClick={() => setShowSearch(true)}
                className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
              >
                جستجوی محصول
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                {item.product?.image_url && (
                  <img src={item.product.image_url} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-stone-800 line-clamp-2 mb-1">{item.product?.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-primary-600 font-bold">
                      {item.product ? formatPrice(item.product.price_amount) : ''}
                    </p>
                    <div className="flex items-center gap-1">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSearch && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-50 flex items-end justify-center" onClick={() => setShowSearch(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 animate-slide-up max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">جستجوی محصول</h2>
              <button onClick={() => setShowSearch(false)} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={20} className="text-stone-500" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="نام محصول..."
                className="flex-1 px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {searching ? <Loader2 size={18} className="animate-spin" /> : 'جستجو'}
              </button>
            </div>

            <div className="space-y-2">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToWishlist(p)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 hover:border-primary-300 hover:bg-primary-50 transition-all text-right"
                >
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 line-clamp-1">{p.title}</p>
                    <p className="text-sm text-primary-600 font-bold">{formatPrice(p.price_amount)}</p>
                  </div>
                  <Heart size={20} className="text-stone-300 shrink-0" />
                </button>
              ))}
              {products.length === 0 && searchQuery && !searching && (
                <p className="text-center text-sm text-stone-400 py-4">موردی یافت نشد</p>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
