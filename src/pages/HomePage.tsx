import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Gift, Calendar, ChevronLeft, Sparkles, Bell, ShoppingBag } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { ClosePerson, Occasion, ShoppingListItem, formatPrice, formatDate, daysUntil } from '../lib/types'
import BottomNav from '../components/BottomNav'

export default function HomePage() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [occasions, setOccasions] = useState<(Occasion & { person_name?: string })[]>([])
  const [people, setPeople] = useState<ClosePerson[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchHomeData()
  }, [user])

  const fetchHomeData = async () => {
    setLoading(true)
    try {
      const { data: peopleData } = await supabase
        .from('close_people')
        .select('*')
        .order('created_at', { ascending: false })
      setPeople(peopleData || [])

      if (peopleData && peopleData.length > 0) {
        const personIds = peopleData.map(p => p.id)
        const { data: occasionsData } = await supabase
          .from('occasions')
          .select('*')
          .in('person_id', personIds)
          .order('occasion_date', { ascending: true })
          .limit(10)

        const occasionsWithNames = (occasionsData || []).map(o => {
          const person = peopleData.find(p => p.id === o.person_id)
          return { ...o, person_name: person?.name }
        })

        const upcoming = occasionsWithNames
          .filter(o => daysUntil(o.occasion_date) >= -1)
          .sort((a, b) => daysUntil(a.occasion_date) - daysUntil(b.occasion_date))
          .slice(0, 3)
        setOccasions(upcoming)
      }

      const { data: shoppingData } = await supabase
        .from('shopping_list_items')
        .select('*, product:products(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setShoppingItems(shoppingData || [])
    } finally {
      setLoading(false)
    }
  }

  const greetingName = profile?.name || 'کاربر'

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="px-5 pt-12 pb-14 shadow-lg" style={{ background: `
        linear-gradient(160deg, rgba(255,255,255,0.14) 0%, transparent 45%, rgba(0,0,0,0.06) 100%),
        linear-gradient(160deg, #d0b893 0%, #C5A880 45%, #b8966a 100%)
      ` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-white text-sm font-medium">سلام {greetingName}</p>
            <h1 className="text-white text-xl font-bold mt-0.5">کادوبا</h1>
          </div>
          <Link to="/notifications" className="relative w-10 h-10 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors">
            <Bell size={20} className="text-white" />
          </Link>
        </div>
      </div>

      <div className="px-5 -mt-10 relative z-10">
        <Link to="/discover" className="block bg-neutral-900 rounded-2xl p-4 shadow-xl animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shrink-0">
              <Sparkles size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-white">بریم یه هدیه خفن پیدا کنیم</h2>
              <p className="text-xs text-white/60">چی دوست داری هدیه بگیری؟</p>
            </div>
            <ChevronLeft size={20} className="text-white/40" />
          </div>
        </Link>
      </div>

      <div className="px-5 mt-6 space-y-6">

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 flex items-center gap-2">
              <Calendar size={18} className="text-primary-500" />
              مناسبت‌های پیش‌رو
            </h2>
            <Link to="/people" className="text-xs text-primary-600 font-medium">همه</Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : occasions.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center border border-stone-100">
              <p className="text-sm text-stone-500 mb-3">هنوز مناسبتی ثبت نشده</p>
              <Link to="/people" className="inline-block text-sm text-primary-600 font-medium hover:underline">
                افزودن مناسبت
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {occasions.map(occ => {
                const days = daysUntil(occ.occasion_date)
                const isToday = days === 0
                const isTomorrow = days === 1
                const isYesterday = days === -1
                const inWindow = days >= -1 && days <= 1
                return (
                  <Link
                    key={occ.id}
                    to={`/discover?person=${occ.person_id}&occasion=${occ.id}`}
                    className={`block bg-white rounded-xl p-3.5 border transition-all hover:shadow-md ${
                      inWindow ? 'border-primary-300 bg-primary-50' : 'border-stone-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          inWindow ? 'bg-primary-500' : 'bg-stone-100'
                        }`}>
                          <Gift size={18} className={inWindow ? 'text-white' : 'text-stone-400'} />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-800 text-sm">{occ.title}</p>
                          <p className="text-xs text-stone-500">
                            {occ.person_name} • {formatDate(occ.occasion_date)}
                          </p>
                        </div>
                      </div>
                      {isToday && (
                        <span className="text-xs font-bold text-white bg-error-500 px-2 py-1 rounded-lg">امروز!</span>
                      )}
                      {isTomorrow && (
                        <span className="text-xs font-bold text-white bg-error-500 px-2 py-1 rounded-lg">فردا</span>
                      )}
                      {days > 1 && (
                        <span className="text-xs text-stone-400">{days} روز دیگر</span>
                      )}
                    </div>
                    {inWindow && (
                      <button className="w-full mt-2.5 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors">
                        تبریک بگو — هدیه بگیر
                      </button>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 flex items-center gap-2">
              <ShoppingBag size={18} className="text-secondary-500" />
              لیست خرید اخیر
            </h2>
            <Link to="/shopping-list" className="text-xs text-primary-600 font-medium">همه</Link>
          </div>

          {shoppingItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center border border-stone-100">
              <p className="text-sm text-stone-500">لیست خرید شما خالی است</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shoppingItems.map(item => (
                <Link
                  key={item.id}
                  to="/shopping-list"
                  className="flex items-center gap-3 bg-white rounded-xl p-3 border border-stone-100 hover:shadow-md transition-all"
                >
                  {item.product?.image_url && (
                    <img src={item.product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.product?.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'reserved' ? 'bg-error-100 text-error-700' :
                        item.status === 'purchased' ? 'bg-secondary-100 text-secondary-700' :
                        'bg-success-100 text-success-700'
                      }`}>
                        {item.status === 'reserved' ? 'رزرو شده' : item.status === 'purchased' ? 'خریدم' : 'هدیه دادم'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {people.length > 0 && (
          <section>
            <h2 className="font-bold text-stone-800 mb-3">نزدیکان</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {people.map(person => (
                <Link
                  key={person.id}
                  to={`/people/${person.id}`}
                  className="flex flex-col items-center gap-2 shrink-0"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      person.name.charAt(0)
                    )}
                  </div>
                  <span className="text-xs text-stone-600 font-medium max-w-[64px] truncate">{person.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
