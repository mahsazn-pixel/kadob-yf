import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Gift, Trash2, Loader2, PartyPopper, Heart, Lock, Globe, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Occasion, Product, MyOccasion, Greeting, formatMonthDay, daysUntilOccasion, formatOccasionDate, composeOccasionDate, formatPrice, parseMonthDay } from '../lib/types'
import OccasionDateFields from '../components/OccasionDateFields'
import GreetingModal from '../components/GreetingModal'
import { getAllLocalPeople, getLocalOccasions, createLocalOccasion, deleteLocalOccasion, upsertLocalOccasion, upsertLocalPerson, getVisibleLocalMyOccasions, getLocalGreetingsForPerson, getLocalGreetingsForReceiver, getLocalProfile, getLocalWishlist } from '../lib/localStore'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [person, setPerson] = useState<ClosePerson | null>(null)
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [wishlistItems, setWishlistItems] = useState<{ product: Product | null; visibility: string }[]>([])
  const [linkedProfile, setLinkedProfile] = useState<{ name: string | null; avatar_url: string | null; birth_date: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddOccasion, setShowAddOccasion] = useState(false)
  const [occTitle, setOccTitle] = useState('')
  const [occMonth, setOccMonth] = useState('')
  const [occDay, setOccDay] = useState('')
  const [occRepeats, setOccRepeats] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editMonth, setEditMonth] = useState('')
  const [editDay, setEditDay] = useState('')
  const [editRepeats, setEditRepeats] = useState(true)
  const [savingEdit, setSavingEdit] = useState(false)
  const [sharedOccasions, setSharedOccasions] = useState<MyOccasion[]>([])
  const [showGreeting, setShowGreeting] = useState(false)
  const [approvedGreetings, setApprovedGreetings] = useState<Greeting[]>([])

  useEffect(() => {
    if (!user || !id) return
    fetchData()
  }, [user, id])

  const fetchData = async () => {
    setLoading(true)
    const applyLocal = () => {
      const personRec = getAllLocalPeople().find(p => p.id === id!) || null
      setPerson(personRec)
      setOccasions(getLocalOccasions(id!))
      if (personRec?.linked_user_id) {
        const linked = getLocalProfile(personRec.linked_user_id)
        setLinkedProfile(linked ? { name: linked.name, avatar_url: linked.avatar_url, birth_date: linked.birth_date } : null)
        const closeness = personRec.closeness
        const visibleWish = getLocalWishlist(personRec.linked_user_id).filter(item => (
          item.visibility === 'public' || closeness === 'very_close'
        ))
        setWishlistItems(visibleWish.map(item => ({ product: item.product, visibility: item.visibility })))
        setSharedOccasions(getVisibleLocalMyOccasions(personRec.linked_user_id, closeness))
      } else {
        setLinkedProfile(null)
        setWishlistItems([])
        setSharedOccasions([])
      }
      const personGreetings = getLocalGreetingsForPerson(id!, ['approved'])
      const linkedGreetings = personRec?.linked_user_id ? getLocalGreetingsForReceiver(personRec.linked_user_id, ['approved']) : []
      const selfGreetings = personRec?.name === 'خودم' ? getLocalGreetingsForReceiver(user!.id, ['approved']) : []
      const merged = [...personGreetings]
      for (const g of [...linkedGreetings, ...selfGreetings]) {
        if (!merged.some(p => p.id === g.id)) merged.push(g)
      }
      setApprovedGreetings(merged)
    }
    if (user!.id.startsWith('local-')) {
      applyLocal()
      setLoading(false)
      return
    }
    try {
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

      if (personRec?.linked_user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, avatar_url, birth_date')
          .eq('id', personRec.linked_user_id)
          .maybeSingle()
        setLinkedProfile(profileData as typeof linkedProfile)

        const { data: wishData } = await supabase
          .from('wishlist_items')
          .select('*, product:products(*)')
          .eq('owner_user_id', personRec.linked_user_id)
          .in('visibility', ['public', 'private'])
          .order('created_at', { ascending: false })
        setWishlistItems((wishData || []) as unknown as { product: Product | null; visibility: string }[])
        const visibilities = personRec.closeness === 'very_close' ? ['public', 'very_close'] : ['public']
        const { data: sharedData } = await supabase
          .from('my_occasions')
          .select('*')
          .eq('owner_user_id', personRec.linked_user_id)
          .in('visibility', visibilities)
          .order('occasion_date', { ascending: true })
        setSharedOccasions((sharedData || []) as MyOccasion[])
        const { data: greetingData } = await supabase
          .from('greetings')
          .select('*')
          .eq('status', 'approved')
          .or(`receiver_person_id.eq.${id},receiver_user_id.eq.${personRec.linked_user_id}`)
        setApprovedGreetings((greetingData || []) as Greeting[])
      } else {
        setLinkedProfile(null)
        setWishlistItems([])
        setSharedOccasions([])
        setApprovedGreetings(getLocalGreetingsForPerson(id!, ['approved']))
      }
    } catch {
      applyLocal()
    } finally {
      setLoading(false)
    }
  }

  const handleAddOccasion = async () => {
    if (!occTitle.trim() || !occMonth || !occDay) return
    const occasionDate = composeOccasionDate(occMonth, occDay)
    createLocalOccasion({
      person_id: id!,
      title: occTitle.trim(),
      occasion_date: occasionDate,
      source: 'manual',
      repeats_yearly: occRepeats,
    })
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('occasions').insert({
          person_id: id!,
          title: occTitle.trim(),
          occasion_date: occasionDate,
          source: 'manual',
          repeats_yearly: occRepeats,
        })
      } catch {
        // local fallback
      }
    }
    setOccTitle('')
    setOccMonth('')
    setOccDay('')
    setOccRepeats(true)
    setShowAddOccasion(false)
    setEditingId(null)
    fetchData()
  }

  const startEditOccasion = (occ: Occasion) => {
    setShowAddOccasion(false)
    setEditingId(occ.id)
    setEditTitle(occ.title)
    const parsed = parseMonthDay(occ.occasion_date)
    setEditMonth(parsed.month)
    setEditDay(parsed.day)
    setEditRepeats(occ.repeats_yearly ?? occ.source === 'birthday')
  }

  const handleSaveOccasion = async () => {
    if (!editingId || !editTitle.trim() || !editMonth || !editDay || !person) return
    setSavingEdit(true)
    const existing = occasions.find(o => o.id === editingId)
    if (!existing) {
      setSavingEdit(false)
      return
    }
    const occasionDate = composeOccasionDate(editMonth, editDay)
    const updated: Occasion = {
      ...existing,
      title: editTitle.trim(),
      occasion_date: occasionDate,
      repeats_yearly: editRepeats,
      updated_at: new Date().toISOString(),
    }
    upsertLocalOccasion(updated)
    if (existing.source === 'birthday') {
      upsertLocalPerson({ ...person, birth_date: occasionDate, updated_at: new Date().toISOString() })
    }
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('occasions').update({
          title: updated.title,
          occasion_date: updated.occasion_date,
          repeats_yearly: updated.repeats_yearly,
        }).eq('id', existing.id)
        if (existing.source === 'birthday') {
          await supabase.from('close_people').update({
            birth_date: occasionDate,
            updated_at: new Date().toISOString(),
          }).eq('id', person.id)
        }
      } catch {
        // local fallback
      }
    }
    setEditingId(null)
    setSavingEdit(false)
    fetchData()
  }

  const handleDeleteOccasion = async (occId: string) => {
    deleteLocalOccasion(occId)
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('occasions').delete().eq('id', occId)
      } catch {
        // local fallback
      }
    }
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
  const birthdayDays = birthdayOccasion ? daysUntilOccasion(birthdayOccasion) : null
  const isSelf = person.name === 'خودم'
  const isBirthdayWindow = birthdayDays !== null && birthdayDays >= -1 && birthdayDays <= 1 && !isSelf

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title={person.name} back />

      <div className="px-4 py-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {(linkedProfile?.avatar_url || person.avatar_url) ? (
                <img src={linkedProfile?.avatar_url || person.avatar_url || ''} alt="" className="w-full h-full object-cover" />
              ) : (
                person.name.charAt(0)
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{person.name}</h2>
              <p className="text-sm text-white/80">
                {person.closeness === 'very_close' ? 'خیلی نزدیک' : person.closeness === 'close' ? 'نزدیک' : 'آشنا'}
                {displayBirthDate && ` • متولد ${formatMonthDay(displayBirthDate)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate(`/discover?person=${person.id}`)}
              className="flex-1 py-2.5 rounded-lg bg-white text-primary-600 font-semibold text-sm hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
            >
              <Gift size={18} /> کادو پیدا کن
            </button>
            {isBirthdayWindow && (
              <button
                onClick={() => setShowGreeting(true)}
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
              onClick={() => {
                setEditingId(null)
                setShowAddOccasion(!showAddOccasion)
              }}
              className="text-sm text-primary-600 font-medium"
            >
              {showAddOccasion ? 'انصراف' : 'افزودن'}
            </button>
          </div>

          {showAddOccasion && (
            <div className="space-y-2 mb-3 animate-slide-up">
              <input
                value={occTitle}
                onChange={(e) => setOccTitle(e.target.value)}
                placeholder="مثلاً تولد"
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <OccasionDateFields
                month={occMonth}
                day={occDay}
                onMonth={setOccMonth}
                onDay={setOccDay}
                repeats={occRepeats}
                onRepeats={setOccRepeats}
              />
              <button
                onClick={handleAddOccasion}
                disabled={!occTitle.trim() || !occMonth || !occDay}
                className="w-full px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
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
                const days = daysUntilOccasion(occ)
                const inWindow = days >= -1 && days <= 1
                if (editingId === occ.id) {
                  return (
                    <div key={occ.id} className="p-3 rounded-xl border bg-white border-primary-200 space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
                      />
                      <OccasionDateFields
                        month={editMonth}
                        day={editDay}
                        onMonth={setEditMonth}
                        onDay={setEditDay}
                        repeats={editRepeats}
                        onRepeats={setEditRepeats}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm text-stone-500 hover:bg-stone-100"
                        >
                          انصراف
                        </button>
                        <button
                          onClick={handleSaveOccasion}
                          disabled={savingEdit || !editTitle.trim() || !editMonth || !editDay}
                          className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 size={14} className="animate-spin" /> : 'ذخیره'}
                        </button>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={occ.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    inWindow ? 'bg-primary-50 border-primary-200' : 'bg-white border-stone-100'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{occ.title}</p>
                      <p className="text-xs text-stone-500">
                        {formatOccasionDate(occ)}
                      </p>
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
                        onClick={() => startEditOccasion(occ)}
                        className="text-stone-300 hover:text-primary-500"
                        aria-label={`ویرایش ${occ.title}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteOccasion(occ.id)}
                        className="text-stone-300 hover:text-error-500"
                        aria-label={`حذف ${occ.title}`}
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

        {approvedGreetings.length > 0 && (
          <section className="mb-6">
            <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
              <PartyPopper size={18} className="text-error-500" />
              پیام‌های تبریک
            </h3>
            <div className="space-y-2">
              {approvedGreetings.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-white border border-stone-100">
                  <p className="text-sm font-medium text-stone-800">{item.sender_name}</p>
                  {item.occasion_title && <p className="text-xs text-stone-400 mt-0.5">{item.occasion_title}</p>}
                  <p className="text-sm text-stone-600 mt-1.5 leading-6">{item.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sharedOccasions.length > 0 && (
          <section className="mb-6">
            <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-secondary-500" />
              مناسبت‌های اشتراک‌گذاری‌شده
            </h3>
            <div className="space-y-2">
              {sharedOccasions.map(occ => (
                <div key={occ.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-100">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{occ.title}</p>
                    <p className="text-xs text-stone-500">{formatOccasionDate(occ)}</p>
                  </div>
                  {occ.visibility === 'very_close' ? (
                    <Lock size={14} className="text-stone-400" />
                  ) : (
                    <Globe size={14} className="text-success-500" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

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
                  {item.visibility === 'private' ? (
                    <Lock size={14} className="text-stone-400 shrink-0" />
                  ) : (
                    <Globe size={14} className="text-success-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showGreeting && (
        <GreetingModal
          person={person}
          occasionId={birthdayOccasion?.id}
          occasionTitle={birthdayOccasion?.title}
          onClose={() => setShowGreeting(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
