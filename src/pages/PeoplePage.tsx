import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Users, X, Loader2, Trash2, Calendar, PartyPopper, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Occasion, MyOccasion, CLOSENESS_OPTIONS, closenessLabel, normalizeCloseness, daysUntilOccasion, formatOccasionDate, parseMonthDay, composeOccasionDate, sortPeopleByNearestOccasion } from '../lib/types'
import OccasionDateFields from '../components/OccasionDateFields'
import {
  getLocalPeople,
  createLocalPerson,
  deleteLocalPerson,
  upsertLocalPerson,
  getLocalOccasions,
  createLocalOccasion,
  upsertLocalOccasion,
  deleteLocalOccasion,
  ensureDemoClosePerson,
  findLocalProfileByPhone,
  applyLinkedAccountToPerson,
  getDisplayOccasionsForPerson,
  getAllDisplayOccasionsForOwner,
  isOwnOccasion,
} from '../lib/localStore'
import GreetingModal from '../components/GreetingModal'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { sendGiftInvite } from '../lib/invite'

export default function PeoplePage() {
  const { user } = useAuth()
  const [people, setPeople] = useState<ClosePerson[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('unknown')
  const [closeness, setCloseness] = useState('very_close')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sendInvite, setSendInvite] = useState(false)

  useEffect(() => {
    if (user) fetchPeople()
  }, [user])

  const fetchPeople = async (withLoading = true) => {
    if (withLoading) setLoading(true)
    const applySorted = (list: ClosePerson[], occasions: Occasion[]) => {
      setPeople(sortPeopleByNearestOccasion(list, occasions))
    }
    if (user!.id.startsWith('local-')) {
      ensureDemoClosePerson(user!.id)
      const list = getLocalPeople(user!.id)
      applySorted(list, getAllDisplayOccasionsForOwner(user!.id))
      if (withLoading) setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('close_people')
        .select('*')
        .eq('owner_user_id', user!.id)
        .order('created_at', { ascending: false })
      const list = data || getLocalPeople(user!.id)
      let occs: Occasion[] = getAllDisplayOccasionsForOwner(user!.id)
      if (list.length > 0) {
        const { data: occData } = await supabase
          .from('occasions')
          .select('*')
          .in('person_id', list.map(p => p.id))
        const ownByPerson = new Map<string, Occasion[]>()
        for (const o of (occData || []) as Occasion[]) {
          const arr = ownByPerson.get(o.person_id) || []
          arr.push(o)
          ownByPerson.set(o.person_id, arr)
        }
        const linkedIds = list.map(p => p.linked_user_id).filter(Boolean) as string[]
        let sharedAll: MyOccasion[] = []
        if (linkedIds.length > 0) {
          const { data: sharedData } = await supabase
            .from('my_occasions')
            .select('*')
            .in('owner_user_id', linkedIds)
          sharedAll = (sharedData || []) as MyOccasion[]
        }
        occs = list.flatMap(p => getDisplayOccasionsForPerson(p, {
          own: ownByPerson.get(p.id) || getLocalOccasions(p.id),
          shared: p.linked_user_id ? sharedAll.filter(s => s.owner_user_id === p.linked_user_id) : [],
        }))
      }
      applySorted(list, occs)
    } catch {
      const list = getLocalPeople(user!.id)
      applySorted(list, getAllDisplayOccasionsForOwner(user!.id))
    } finally {
      if (withLoading) setLoading(false)
    }
  }

  const refreshOrder = () => fetchPeople(false)

  const handleAdd = async () => {
    setError('')
    if (!name.trim()) {
      setError('نام را وارد کنید')
      return
    }
    setSaving(true)
    const isLocal = user!.id.startsWith('local-')
    let linkedUserId: string | null = null
    let birthDateStr: string | null = null
    if (phone) {
      const localMatch = findLocalProfileByPhone(phone)
      if (localMatch) {
        linkedUserId = localMatch.id
        birthDateStr = localMatch.birth_date
      }
    }
    if (!isLocal && phone && !linkedUserId) {
      try {
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('id, birth_date')
          .eq('phone_number', phone)
          .maybeSingle()
        linkedUserId = profileMatch?.id || null
        birthDateStr = profileMatch?.birth_date || null
      } catch {
        linkedUserId = null
      }
    }
    let newPerson: ClosePerson | null = null
    if (isLocal) {
      newPerson = createLocalPerson({
        owner_user_id: user!.id,
        linked_user_id: linkedUserId,
        name: name.trim(),
        phone: phone || null,
        avatar_url: null,
        birth_date: birthDateStr,
        gender,
        closeness,
      })
    } else {
      try {
        const { data, error: insertError } = await supabase
          .from('close_people')
          .insert({
            owner_user_id: user!.id,
            name: name.trim(),
            phone: phone || null,
            birth_date: birthDateStr,
            gender,
            closeness,
            linked_user_id: linkedUserId,
          })
          .select()
          .single()
        if (insertError) throw insertError
        newPerson = data
      } catch {
        newPerson = createLocalPerson({
          owner_user_id: user!.id,
          linked_user_id: linkedUserId,
          name: name.trim(),
          phone: phone || null,
          avatar_url: null,
          birth_date: birthDateStr,
          gender,
          closeness,
        })
      }
    }
    if (newPerson && linkedUserId) {
      applyLinkedAccountToPerson({ ...newPerson, linked_user_id: linkedUserId })
    }
    const invitePhone = phone
    const shouldInvite = sendInvite && /^09\d{9}$/.test(invitePhone)
    setName('')
    setPhone('')
    setGender('unknown')
    setCloseness('very_close')
    setSendInvite(false)
    setShowAdd(false)
    setSaving(false)
    fetchPeople()
    if (shouldInvite) {
      void sendGiftInvite(invitePhone)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (name === 'خودم') return
    if (!window.confirm(`آیا از حذف «${name}» از لیست نزدیکان مطمئن هستید؟`)) return
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('close_people').delete().eq('id', id)
      } catch {
        // local fallback
      }
    }
    deleteLocalPerson(id)
    fetchPeople()
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader
        title="نزدیکان"
        subtitle={`${people.length} نفر`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
          >
            <UserPlus size={18} />
          </button>
        }
      />

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400" />
          </div>
        ) : (() => {
          const selfPerson = people.find(p => p.name === 'خودم')
          const others = people.filter(p => p.name !== 'خودم')
          if (others.length === 0) {
            return (
              <>
                {selfPerson && (
                  <div className="mb-4">
                    <PersonCard key={selfPerson.id} person={selfPerson} onDelete={handleDelete} isSelf onOccasionsChange={refreshOrder} onUpdated={refreshOrder} />
                  </div>
                )}
                <EmptyState
                  icon={<Users size={32} />}
                  title="هنوز هیچ کسی در لیست نزدیکان وارد نشده"
                  description="نزدیکان خود را اضافه کنید تا برایشان هدیه پیدا کنید"
                  action={
                    <button
                      onClick={() => setShowAdd(true)}
                      className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                      افزودن نزدیک
                    </button>
                  }
                />
              </>
            )
          }
          return (
            <>
              {selfPerson && (
                <div className="mb-4">
                  <PersonCard key={selfPerson.id} person={selfPerson} onDelete={handleDelete} isSelf onOccasionsChange={refreshOrder} onUpdated={refreshOrder} />
                </div>
              )}
              <div className="space-y-2">
                {others.map(person => (
                  <PersonCard key={person.id} person={person} onDelete={handleDelete} onOccasionsChange={refreshOrder} onUpdated={refreshOrder} />
                ))}
              </div>
            </>
          )
        })()}
      </div>

      {showAdd && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[60] flex items-end justify-center" onClick={() => { setShowAdd(false); setSendInvite(false) }}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">افزودن نزدیک</h2>
              <button onClick={() => { setShowAdd(false); setSendInvite(false) }} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={20} className="text-stone-500" />
              </button>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-error-50 text-error-600 text-sm">{error}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm text-stone-600 mb-1 block">نام *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً مریم"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block">شماره موبایل (اختیاری)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setPhone(next)
                    if (!next) setSendInvite(false)
                  }}
                  placeholder="09xxxxxxxxx"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
                {phone.length > 0 && (
                  <label className="mt-2 flex items-start gap-2.5 p-3 rounded-xl bg-primary-50 border border-primary-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInvite}
                      onChange={(e) => setSendInvite(e.target.checked)}
                      disabled={!/^09\d{9}$/.test(phone)}
                      className="mt-0.5 w-4 h-4 rounded border-stone-300 text-primary-500 accent-primary-500"
                    />
                    <span className="text-sm text-stone-700 leading-6">
                      پیام دعوت فرستاده شود
                    </span>
                  </label>
                )}
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block">جنسیت</label>
                <div className="flex gap-2">
                  {[
                    { v: 'male', l: 'مرد' },
                    { v: 'female', l: 'زن' },
                    { v: 'unknown', l: 'نامشخص' },
                  ].map(g => (
                    <button
                      key={g.v}
                      onClick={() => setGender(g.v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        gender === g.v ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block">میزان نزدیکی</label>
                <div className="flex gap-2">
                  {CLOSENESS_OPTIONS.map(c => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setCloseness(c.v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        closeness === c.v ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full mt-5 py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : 'افزودن'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function PersonCard({ person, onDelete, isSelf = false, onOccasionsChange, onUpdated }: { person: ClosePerson; onDelete: (id: string, name: string) => void; isSelf?: boolean; onOccasionsChange?: () => void; onUpdated?: () => void }) {
  const [showGreeting, setShowGreeting] = useState(false)
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [expanded, setExpanded] = useState(false)
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
  const [editingPerson, setEditingPerson] = useState(false)
  const [editName, setEditName] = useState(person.name)
  const [editPhone, setEditPhone] = useState(person.phone || '')
  const [editCloseness, setEditCloseness] = useState(normalizeCloseness(person.closeness))
  const [savingPerson, setSavingPerson] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    fetchOccasions()
  }, [person.id])

  const fetchOccasions = async () => {
    const local = getDisplayOccasionsForPerson(person)
    if (person.owner_user_id.startsWith('local-')) {
      setOccasions(local)
      return
    }
    try {
      const { data } = await supabase
        .from('occasions')
        .select('*')
        .eq('person_id', person.id)
        .order('occasion_date', { ascending: true })
      let shared: MyOccasion[] = []
      if (person.linked_user_id) {
        const visibilities = person.closeness === 'very_close' ? ['public', 'very_close'] : ['public']
        const { data: sharedData } = await supabase
          .from('my_occasions')
          .select('*')
          .eq('owner_user_id', person.linked_user_id)
          .in('visibility', visibilities)
        shared = (sharedData || []) as MyOccasion[]
      }
      setOccasions(getDisplayOccasionsForPerson(person, {
        own: (data as Occasion[] | null) || getLocalOccasions(person.id),
        shared,
      }))
    } catch {
      setOccasions(local)
    }
  }

  const nearestOccasion = occasions
    .filter(o => daysUntilOccasion(o) >= -1)
    .sort((a, b) => daysUntilOccasion(a) - daysUntilOccasion(b))[0]
  const nearestDays = nearestOccasion ? daysUntilOccasion(nearestOccasion) : null
  const isBirthdayWindow = nearestOccasion && nearestDays !== null && nearestDays >= -1 && nearestDays <= 1 && nearestOccasion.source === 'birthday'

  const handleAddOccasion = async () => {
    if (!occTitle.trim() || !occMonth || !occDay) return
    const occasionDate = composeOccasionDate(occMonth, occDay)
    createLocalOccasion({
      person_id: person.id,
      title: occTitle.trim(),
      occasion_date: occasionDate,
      source: 'manual',
      repeats_yearly: occRepeats,
    })
    if (!person.owner_user_id.startsWith('local-')) {
      try {
        await supabase.from('occasions').insert({
          person_id: person.id,
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
    fetchOccasions()
    onOccasionsChange?.()
  }

  const handleDeleteOccasion = async (id: string) => {
    const target = occasions.find(o => o.id === id)
    if (target && !isOwnOccasion(target)) return
    deleteLocalOccasion(id)
    if (!person.owner_user_id.startsWith('local-')) {
      try {
        await supabase.from('occasions').delete().eq('id', id)
      } catch {
        // local fallback
      }
    }
    if (editingId === id) setEditingId(null)
    fetchOccasions()
    onOccasionsChange?.()
  }

  const startEditOccasion = (occ: Occasion) => {
    if (!isOwnOccasion(occ)) return
    setShowAddOccasion(false)
    setEditingId(occ.id)
    setEditTitle(occ.title)
    const parsed = parseMonthDay(occ.occasion_date)
    setEditMonth(parsed.month)
    setEditDay(parsed.day)
    setEditRepeats(occ.repeats_yearly ?? occ.source === 'birthday')
  }

  const openEditPerson = () => {
    setEditName(person.name)
    setEditPhone(person.phone || '')
    setEditCloseness(normalizeCloseness(person.closeness))
    setEditError('')
    setEditingPerson(true)
  }

  const handleSavePerson = async () => {
    if (!editName.trim()) {
      setEditError('نام را وارد کنید')
      return
    }
    setSavingPerson(true)
    const now = new Date().toISOString()
    const nextPhone = editPhone.replace(/\D/g, '').slice(0, 11) || null
    const updated: ClosePerson = {
      ...person,
      name: editName.trim(),
      phone: nextPhone,
      closeness: editCloseness,
      updated_at: now,
    }
    upsertLocalPerson(updated)
    if (!person.owner_user_id.startsWith('local-')) {
      try {
        await supabase.from('close_people').update({
          name: updated.name,
          phone: updated.phone,
          closeness: updated.closeness,
          updated_at: now,
        }).eq('id', person.id)
      } catch {
        // local fallback
      }
    }
    setSavingPerson(false)
    setEditingPerson(false)
    onUpdated?.()
  }

  const handleSaveOccasion = async () => {
    if (!editingId || !editTitle.trim() || !editMonth || !editDay) return
    setSavingEdit(true)
    const existing = occasions.find(o => o.id === editingId)
    if (!existing || !isOwnOccasion(existing)) {
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
    if (!person.owner_user_id.startsWith('local-')) {
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
    fetchOccasions()
    onOccasionsChange?.()
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isSelf ? 'bg-primary-50 border-primary-300' : 'bg-white border-stone-100'}`}>
      <div className="p-3.5 flex items-center gap-3">
        <Link to={`/people/${person.id}`} className="shrink-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden ${isSelf ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-primary-200 to-primary-400'}`}>
            {person.avatar_url ? (
              <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              person.name.charAt(0)
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          {isSelf ? (
            <Link to="/profile" className="font-semibold text-primary-600 hover:underline">
              {person.name}
            </Link>
          ) : person.linked_user_id ? (
            <Link to={`/people/${person.id}`} className="font-semibold text-primary-600 hover:underline">
              {person.name}
            </Link>
          ) : (
            <p className="font-semibold text-stone-800">{person.name}</p>
          )}
          {!isSelf && (
            <p className="text-xs text-stone-500 mt-0.5">{closenessLabel(person.closeness)}{person.phone ? ` • ${person.phone}` : ''}</p>
          )}
          {occasions.length > 0 && (
            <p className="text-xs text-stone-500">{occasions.length} مناسبت</p>
          )}
          {nearestOccasion && nearestDays !== null && (
            <p className="text-xs mt-0.5 font-medium text-primary-600">
              {nearestDays === 0 ? `${nearestOccasion.title} - امروز!` :
               nearestDays === 1 ? `${nearestOccasion.title} - فردا` :
               nearestDays > 0 ? `${nearestOccasion.title} - ${nearestDays} روز دیگر` :
               `${nearestOccasion.title} - گذشته`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isBirthdayWindow && !isSelf && (
            <button
              onClick={() => setShowGreeting(true)}
              className="px-3 py-1.5 rounded-lg bg-error-500 text-white text-xs font-medium hover:bg-error-600 transition-colors flex items-center gap-1"
            >
              <PartyPopper size={14} /> تبریک
            </button>
          )}
          <Link
            to={`/discover?person=${person.id}`}
            className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 transition-colors"
          >
            کادو پیدا کن
          </Link>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Calendar size={18} className="text-stone-400" />
          </button>
          {!isSelf && (
            <>
              <button
                onClick={openEditPerson}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label={`ویرایش ${person.name}`}
              >
                <Edit2 size={16} className="text-stone-400 hover:text-primary-500 transition-colors" />
              </button>
              <button
                onClick={() => onDelete(person.id, person.name)}
                className="p-1.5 rounded-lg hover:bg-error-50 transition-colors"
                aria-label={`حذف ${person.name}`}
              >
                <Trash2 size={16} className="text-stone-400 hover:text-error-500 transition-colors" />
              </button>
            </>
          )}
        </div>
      </div>

      {editingPerson && (
        <div className="px-3.5 pb-3.5 border-t border-stone-100 pt-3 animate-slide-up">
          {editError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-error-50 text-error-600 text-sm">{editError}</div>
          )}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-stone-600 mb-1 block">نام</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">شماره تلفن</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="09xxxxxxxxx"
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-stone-600 mb-1 block">میزان نزدیکی</label>
              <div className="flex gap-2">
                {CLOSENESS_OPTIONS.map(c => (
                  <button
                    key={c.v}
                    type="button"
                    onClick={() => setEditCloseness(c.v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      editCloseness === c.v ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setEditingPerson(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-stone-500 hover:bg-stone-100"
              >
                انصراف
              </button>
              <button
                onClick={handleSavePerson}
                disabled={savingPerson || !editName.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium disabled:opacity-50"
              >
                {savingPerson ? <Loader2 size={12} className="animate-spin" /> : 'ذخیره'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGreeting && (
        <GreetingModal
          person={person}
          occasionId={nearestOccasion?.id}
          occasionTitle={nearestOccasion?.title}
          onClose={() => setShowGreeting(false)}
        />
      )}

      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-stone-100 pt-3 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-stone-600">مناسبت‌ها</p>
            <button
              onClick={() => {
                setEditingId(null)
                setShowAddOccasion(!showAddOccasion)
              }}
              className="text-xs text-primary-600 font-medium"
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
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <OccasionDateFields
                month={occMonth}
                day={occDay}
                onMonth={setOccMonth}
                onDay={setOccDay}
                repeats={occRepeats}
                onRepeats={setOccRepeats}
                compact
              />
              <button
                onClick={handleAddOccasion}
                disabled={!occTitle.trim() || !occMonth || !occDay}
                className="w-full px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
              >
                ثبت
              </button>
            </div>
          )}

          {occasions.length === 0 ? (
            <p className="text-xs text-stone-400 py-2">مناسبتی ثبت نشده</p>
          ) : (
            <div className="space-y-1.5">
              {occasions.map(occ => {
                const days = daysUntilOccasion(occ)
                if (editingId === occ.id) {
                  return (
                    <div key={occ.id} className="py-1.5 px-2 rounded-lg bg-stone-50 space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
                      />
                      <OccasionDateFields
                        month={editMonth}
                        day={editDay}
                        onMonth={setEditMonth}
                        onDay={setEditDay}
                        repeats={editRepeats}
                        onRepeats={setEditRepeats}
                        compact
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-stone-500 hover:bg-stone-100"
                        >
                          انصراف
                        </button>
                        <button
                          onClick={handleSaveOccasion}
                          disabled={savingEdit || !editTitle.trim() || !editMonth || !editDay}
                          className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 size={12} className="animate-spin" /> : 'ذخیره'}
                        </button>
                      </div>
                    </div>
                  )
                }
                const canEdit = isOwnOccasion(occ)
                return (
                  <div key={occ.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-stone-50">
                    <div>
                      <p className="text-sm text-stone-700">{occ.title}</p>
                      <p className="text-xs text-stone-400">
                        {formatOccasionDate(occ)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {days >= -1 && days <= 1 && (
                        <span className="text-xs text-primary-600 font-medium">
                          {days === 0 ? 'امروز' : days === 1 ? 'فردا' : 'دیروز'}
                        </span>
                      )}
                      {canEdit && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
