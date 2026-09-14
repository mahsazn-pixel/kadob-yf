import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Gift, ChevronLeft, Plus, Trash2, Loader2, PartyPopper, Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Occasion, ShoppingListItem, Product, formatDate, daysUntil, formatPrice } from '../lib/types'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import BottomNav from '../components/BottomNav'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [person, setPerson] = useState<ClosePerson | null>(null)
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<{ product: Product | null }[]>([])
  const [linkedProfile, setLinkedProfile] = useState<{ name: string | null; avatar_url: string | null; birth_date: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddOccasion, setShowAddOccasion] = useState(false)
  const [occTitle, setOccTitle] = useState('')
  const [occDate, setOccDate] = useState('')

  useEffect(() => {
    if (!user || !id) return
    fetchData()
  }, [user, id])

  const fetchData = async () => {
    setLoading(true)
    const { data: personData } = await supabase
      .from('close_people')
      .select('*')
      .eq('id', id!)
      .maybeSingle()
    const personRec = personData as ClosePerson | null
    setPerson(personRec)

    const { data: occasionsData } = await supabase
      .from('occasions')
      .select('*')
      .eq('person_id', id!)
      .order('occasion_date', { ascending: true })
    setOccasions(occasionsData || [])

    const { data: shoppingData } = await supabase
      .from('shopping_list_items')
      .select('*, product:products(*)')
      .eq('receiver_id', id!)
      .order('created_at', { ascending: false })
    setShoppingItems(shoppingData || [])

    if (personRec?.linked_user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url, birth_date')
        .eq('id', personRec.linked_user_id)
        .maybeSingle()
      setLinkedProfile(profileData as typeof linkedProfile)

      const { data: wishData } = await supabase
        .from('wishlist_items')
        .select('product:products(*)')
        .eq('owner_user_id', personRec.linked_user_id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
      setWishlistItems((wishData || []) as unknown as { product: Product | null }[])
    } else {
      setLinkedProfile(null)
      setWishlistItems([])
    }

    setLoading(false)
  }

  const handleAddOccasion = async () => {
    if (!occTitle.trim() || !occDate) return
    await supabase.from('occasions').insert({
      person_id: id!,
      title: occTitle.trim(),
      occasion_date: occDate,
      source: 'manual',
    })
    setOccTitle('')
    setOccDate('')
    setShowAddOccasion(false)
    fetchData()
  }

  const handleDeleteOccasion = async (occId: string) => {
    await supabase.from('occasions').delete().eq('id', occId)
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    )
  }

  if (!person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-stone-500 mb-4">شخص یافت نشد</p>
        <button onClick={() => navigate('/people')} className="text-primary-600 font-medium">بازگشت</button>
      </div>
    )
  }

  const displayBirthDate = person.linked_user_id && linkedProfile?.birth_date ? linkedProfile.birth_date : person.birth_date

  const birthdayOccasion = occasions.find(o => o.source === 'birthday')
  const birthdayDays = birthdayOccasion ? daysUntil(birthdayOccasion.occasion_date) : null
  const isBirthdayWindow = birthdayDays !== null && birthdayDays >= -1 && birthdayDays <= 1

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title={person.name} back />

      <div className="px-4 py-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {person.avatar_url ? (
                <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                person.name.charAt(0)
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{person.name}</h2>
              <p className="text-sm text-white/80">
                {person.closeness === 'very_close' ? 'خیلی نزدیک' : person.closeness === 'close' ? 'نزدیک' : 'آشنا'}
                {displayBirthDate && ` • متولد ${formatDate(displayBirthDate)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate(`/discover?person=${person.id}`)}
              className="flex-1 py-2.5 rounded-lg bg-white text-primary-600 font-semibold text-sm hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
            >
              <Gift size={18} /> هدیه بگیر
            </button>
            {isBirthdayWindow && (
              <button
                onClick={() => navigate(`/discover?person=${person.id}`)}
                className="flex-1 py-2.5 rounded-lg bg-error-500 text-white font-semibold text-sm hover:bg-error-600 transition-colors flex items-center justify-center gap-2"
              >
                <PartyPopper size={18} /> تبریک بگو
              </button>
            )}
          </div>
        </div>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Calendar size={18} className="text-primary-500" />
              مناسبت‌ها
            </h3>
            <button
              onClick={() => setShowAddOccasion(!showAddOccasion)}
              className="text-sm text-primary-600 font-medium"
            >
              {showAddOccasion ? 'انصراف' : 'افزودن'}
            </button>
          </div>

          {showAddOccasion && (
            <div className="flex gap-2 mb-3 animate-slide-up">
              <input
                value={occTitle}
                onChange={(e) => setOccTitle(e.target.value)}
                placeholder="مثلاً تولد"
                className="flex-1 px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <input
                type="date"
                value={occDate}
                onChange={(e) => setOccDate(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <button
                onClick={handleAddOccasion}
                className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
              >
                ثبت
              </button>
            </div>
          )}

          {occasions.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center border border-stone-100">
              <p className="text-sm text-stone-400">مناسبتی ثبت نشده</p>
            </div>
          ) : (
            <div className="space-y-2">
              {occasions.map(occ => {
                const days = daysUntil(occ.occasion_date)
                const inWindow = days >= -1 && days <= 1
                return (
                  <div key={occ.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    inWindow ? 'bg-primary-50 border-primary-200' : 'bg-white border-stone-100'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{occ.title}</p>
                      <p className="text-xs text-stone-500">{formatDate(occ.occasion_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {days >= 0 && days <= 30 && (
                        <span className="text-xs text-stone-500">{days} روز دیگر</span>
                      )}
                      {inWindow && (
                        <span className="text-xs text-primary-600 font-bold bg-primary-100 px-2 py-0.5 rounded-lg">
                          {days === 0 ? 'امروز!' : days === 1 ? 'فردا' : 'دیروز'}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteOccasion(occ.id)}
                        className="text-stone-300 hover:text-error-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {person.linked_user_id && wishlistItems.length > 0 && (
          <section className="mb-6">
            <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
              <Heart size={18} className="text-primary-500" />
              لیست خواسته‌ها
            </h3>
            <div className="space-y-2">
              {wishlistItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-100">
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.product?.title}</p>
                    <p className="text-xs text-stone-500">
                      {item.product ? formatPrice(item.product.price_amount) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="font-bold text-stone-800 mb-3">کادوهای رزرو شده</h3>
          {shoppingItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center border border-stone-100">
              <p className="text-sm text-stone-400">کادویی برای این نفر ثبت نشده</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shoppingItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-100">
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.product?.title}</p>
                    <p className="text-xs text-stone-500">
                      {item.product ? formatPrice(item.product.price_amount) : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'reserved' ? 'bg-error-100 text-error-700' :
                    item.status === 'purchased' ? 'bg-secondary-100 text-secondary-700' :
                    'bg-success-100 text-success-700'
                  }`}>
                    {item.status === 'reserved' ? 'رزرو' : item.status === 'purchased' ? 'خریدم' : 'هدیه دادم'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  )
}
