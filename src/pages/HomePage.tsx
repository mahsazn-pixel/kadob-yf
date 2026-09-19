import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Calendar, ChevronLeft, Sparkles, Bell, ShoppingBag, PartyPopper } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { ClosePerson, Occasion, MyOccasion, ShoppingListItem, daysUntilOccasion, formatRemainingTime, sortPeopleByNearestOccasion } from '../lib/types'
import { getLocalPeople, getUpcomingLocalOccasions, getLocalShoppingItems, ensureDemoClosePerson, getDisplayOccasionsForPerson, getLocalOccasions, getLocalNotifications } from '../lib/localStore'
import GreetingModal from '../components/GreetingModal'
import BottomNav from '../components/BottomNav'

export default function HomePage() {
  const { profile, user } = useAuth()
  const [occasions, setOccasions] = useState<(Occasion & { person_name?: string })[]>([])
  const [people, setPeople] = useState<ClosePerson[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [greetingTarget, setGreetingTarget] = useState<{ person: ClosePerson; occasionId: string; occasionTitle: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchHomeData()
  }, [user])

  const fetchHomeData = async () => {
    setLoading(true)
    const applyLocal = () => {
      ensureDemoClosePerson(user!.id)
      const localPeople = getLocalPeople(user!.id)
      const allOcc = getUpcomingLocalOccasions(user!.id)
      setPeople(sortPeopleByNearestOccasion(localPeople, allOcc))
      const upcoming = allOcc
        .filter(o => daysUntilOccasion(o) >= -1)
        .sort((a, b) => daysUntilOccasion(a) - daysUntilOccasion(b))
        .slice(0, 3)
      setOccasions(upcoming)
      setShoppingItems(getLocalShoppingItems(user!.id).slice(0, 5))
      setUnreadCount(getLocalNotifications(user!.id).filter(n => n.status === 'unread').length)
    }
    if (user!.id.startsWith('local-')) {
      applyLocal()
      setLoading(false)
      return
    }
    try {
      const { data: peopleData } = await supabase
        .from('close_people')
        .select('*')
        .order('created_at', { ascending: false })
      const peopleList = peopleData || []

      if (peopleList.length > 0) {
        const personIds = peopleList.map(p => p.id)
        const { data: occasionsData } = await supabase
          .from('occasions')
          .select('*')
          .in('person_id', personIds)
          .order('occasion_date', { ascending: true })
        const ownByPerson = new Map<string, Occasion[]>()
        for (const o of (occasionsData || []) as Occasion[]) {
          const arr = ownByPerson.get(o.person_id) || []
          arr.push(o)
          ownByPerson.set(o.person_id, arr)
        }
        const linkedIds = peopleList.map(p => p.linked_user_id).filter(Boolean) as string[]
        let sharedAll: MyOccasion[] = []
        if (linkedIds.length > 0) {
          const { data: sharedData } = await supabase
            .from('my_occasions')
            .select('*')
            .in('owner_user_id', linkedIds)
          sharedAll = (sharedData || []) as MyOccasion[]
        }
        const occasionsWithNames = peopleList.flatMap(person => (
          getDisplayOccasionsForPerson(person, {
            own: ownByPerson.get(person.id) || getLocalOccasions(person.id),
            shared: person.linked_user_id ? sharedAll.filter(s => s.owner_user_id === person.linked_user_id) : [],
          }).map(o => ({ ...o, person_name: person.name }))
        ))

        setPeople(sortPeopleByNearestOccasion(peopleList, occasionsWithNames))
        const upcoming = occasionsWithNames
          .filter(o => daysUntilOccasion(o) >= -1)
          .sort((a, b) => daysUntilOccasion(a) - daysUntilOccasion(b))
          .slice(0, 3)
        setOccasions(upcoming)
      } else {
        setPeople([])
      }

      const { data: shoppingData } = await supabase
        .from('shopping_list_items')
        .select('*, product:products(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setShoppingItems(shoppingData || [])
    } catch {
      applyLocal()
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
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
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
              <p className="text-sm text-stone-500 mb-3">هنوز هیچ مناسبتی وارد نشده</p>
              <Link to="/people" className="inline-block text-sm text-primary-600 font-medium hover:underline">
                افزودن مناسبت
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {occasions.map(occ => {
                const days = daysUntilOccasion(occ)
                const inWindow = days >= -1 && days <= 1
                const giftHref = `/discover?person=${occ.person_id}&occasion=${occ.id}`
                return (
                  <div
                    key={occ.id}
                    className={`bg-white rounded-xl p-3.5 border ${
                      inWindow ? 'border-primary-300 bg-primary-50' : 'border-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        inWindow ? 'bg-primary-500' : 'bg-stone-100'
                      }`}>
                        <Gift size={18} className={inWindow ? 'text-white' : 'text-stone-400'} />
                      </div>
                      <p className="font-semibold text-stone-800 text-sm">
                        {occ.title} {occ.person_name} • {formatRemainingTime(days)}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      {inWindow && (
                        <button
                          onClick={() => {
                            const person = people.find(p => p.id === occ.person_id)
                            if (!person) return
                            setGreetingTarget({ person, occasionId: occ.id, occasionTitle: occ.title })
                          }}
                          className="flex-1 py-2 rounded-lg bg-error-500 text-white text-sm font-medium hover:bg-error-600 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <PartyPopper size={16} /> تبریک بگو
                        </button>
                      )}
                      <Link
                        to={giftHref}
                        className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Gift size={16} /> هدیه بگیر
                      </Link>
                    </div>
                  </div>
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

      {greetingTarget && (
        <GreetingModal
          person={greetingTarget.person}
          occasionId={greetingTarget.occasionId}
          occasionTitle={greetingTarget.occasionTitle}
          onClose={() => setGreetingTarget(null)}
        />
      )}

      <BottomNav />
    </div>
  )
}
