import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Users, X, Loader2, Trash2, Calendar, PartyPopper, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Occasion, formatDate, daysUntil } from '../lib/types'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function PeoplePage() {
  const { user } = useAuth()
  const [people, setPeople] = useState<ClosePerson[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [gender, setGender] = useState('unknown')
  const [closeness, setCloseness] = useState('close')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) fetchPeople()
  }, [user])

  const fetchPeople = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('close_people')
      .select('*')
      .eq('owner_user_id', user!.id)
      .order('created_at', { ascending: false })
    const peopleData = data || []
    const hasSelf = peopleData.some(p => p.name === 'خودم')
    if (!hasSelf) {
      await supabase.from('close_people').insert({
        owner_user_id: user!.id,
        name: 'خودم',
        closeness: 'very_close',
        gender: 'unknown',
      })
      const { data: refreshed } = await supabase
        .from('close_people')
        .select('*')
        .eq('owner_user_id', user!.id)
        .order('created_at', { ascending: false })
      setPeople(refreshed || [])
    } else {
      setPeople(peopleData)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    setError('')
    if (!name.trim()) {
      setError('نام را وارد کنید')
      return
    }
    let birthDateStr: string | null = null
    if (birthMonth && birthDay) {
      const now = new Date()
      const monthNum = parseInt(birthMonth, 10)
      const dayNum = parseInt(birthDay, 10)
      const thisYear = now.getFullYear()
      const candidate = new Date(thisYear, monthNum - 1, dayNum)
      candidate.setHours(0, 0, 0, 0)
      now.setHours(0, 0, 0, 0)
      const yearToUse = candidate < now ? thisYear + 1 : thisYear
      birthDateStr = `${yearToUse}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    }
    setSaving(true)
    let linkedUserId: string | null = null
    if (phone) {
      const { data: profileMatch } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phone)
        .maybeSingle()
      linkedUserId = profileMatch?.id || null
    }
    const { data: newPerson, error: insertError } = await supabase
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
    if (insertError) {
      setError('خطا در افزودن')
      setSaving(false)
      return
    }
    if (birthDateStr && newPerson) {
      const { error: occError } = await supabase.from('occasions').insert({
        person_id: newPerson.id,
        title: 'تولد',
        occasion_date: birthDateStr,
        source: 'birthday',
      })
      if (occError) {
        console.error('Birthday occasion insert error:', occError)
      }
    }
    setName('')
    setPhone('')
    setBirthMonth('')
    setBirthDay('')
    setGender('unknown')
    setCloseness('close')
    setShowAdd(false)
    setSaving(false)
    fetchPeople()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('close_people').delete().eq('id', id)
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
        ) : people.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title="هنوز کسی اضافه نکردید"
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
        ) : (
          (() => {
            const selfPerson = people.find(p => p.name === 'خودم')
            const others = people.filter(p => p.name !== 'خودم')
            return (
              <>
                {selfPerson && (
                  <div className="mb-4">
                    <PersonCard key={selfPerson.id} person={selfPerson} onDelete={handleDelete} isSelf />
                  </div>
                )}
                {others.length > 0 && (
                  <div className="space-y-2">
                    {others.map(person => (
                      <PersonCard key={person.id} person={person} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </>
            )
          })()
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full max-w-md rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">افزودن نزدیک</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-stone-100">
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
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="09xxxxxxxxx"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 mb-1 block">تاریخ تولد (اختیاری)</label>
                <div className="flex gap-2">
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="flex-1 px-3 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                  >
                    <option value="">ماه</option>
                    <option value="01">فروردین</option>
                    <option value="02">اردیبهشت</option>
                    <option value="03">خرداد</option>
                    <option value="04">تیر</option>
                    <option value="05">مرداد</option>
                    <option value="06">شهریور</option>
                    <option value="07">مهر</option>
                    <option value="08">آبان</option>
                    <option value="09">آذر</option>
                    <option value="10">دی</option>
                    <option value="11">بهمن</option>
                    <option value="12">اسفند</option>
                  </select>
                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="flex-1 px-3 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                  >
                    <option value="">روز</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0')
                      return <option key={d} value={d}>{String(i + 1).padStart(2, '0')}</option>
                    })}
                  </select>
                </div>
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
                  {[
                    { v: 'very_close', l: 'خیلی نزدیک' },
                    { v: 'close', l: 'نزدیک' },
                    { v: 'acquaintance', l: 'آشنا' },
                  ].map(c => (
                    <button
                      key={c.v}
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

function PersonCard({ person, onDelete, isSelf = false }: { person: ClosePerson; onDelete: (id: string) => void; isSelf?: boolean }) {
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [expanded, setExpanded] = useState(false)
  const [showAddOccasion, setShowAddOccasion] = useState(false)
  const [occTitle, setOccTitle] = useState('')
  const [occDate, setOccDate] = useState('')
  const [editingBirthday, setEditingBirthday] = useState(false)
  const [editMonth, setEditMonth] = useState('')
  const [editDay, setEditDay] = useState('')
  const [savingBirthday, setSavingBirthday] = useState(false)

  useEffect(() => {
    fetchOccasions()
  }, [person.id])

  const fetchOccasions = async () => {
    const { data } = await supabase
      .from('occasions')
      .select('*')
      .eq('person_id', person.id)
      .order('occasion_date', { ascending: true })
    setOccasions(data || [])
  }

  const nearestOccasion = occasions
    .filter(o => daysUntil(o.occasion_date) >= -1)
    .sort((a, b) => daysUntil(a.occasion_date) - daysUntil(b.occasion_date))[0]
  const nearestDays = nearestOccasion ? daysUntil(nearestOccasion.occasion_date) : null
  const isBirthdayWindow = nearestOccasion && nearestDays !== null && nearestDays >= -1 && nearestDays <= 1 && nearestOccasion.source === 'birthday'

  const handleSaveBirthday = async () => {
    if (!editMonth || !editDay) return
    setSavingBirthday(true)
    const now = new Date()
    const monthNum = parseInt(editMonth, 10)
    const dayNum = parseInt(editDay, 10)
    const thisYear = now.getFullYear()
    const candidate = new Date(thisYear, monthNum - 1, dayNum)
    candidate.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    const yearToUse = candidate < now ? thisYear + 1 : thisYear
    const newDate = `${yearToUse}-${editMonth.padStart(2, '0')}-${editDay.padStart(2, '0')}`
    await supabase.from('close_people').update({ birth_date: newDate, updated_at: new Date().toISOString() }).eq('id', person.id)
    const existing = occasions.find(o => o.source === 'birthday')
    if (existing) {
      await supabase.from('occasions').update({ occasion_date: newDate }).eq('id', existing.id)
    } else {
      await supabase.from('occasions').insert({ person_id: person.id, title: 'تولد', occasion_date: newDate, source: 'birthday' })
    }
    setEditingBirthday(false)
    setSavingBirthday(false)
    fetchOccasions()
  }

  const handleAddOccasion = async () => {
    if (!occTitle.trim() || !occDate) return
    const { error: occError } = await supabase.from('occasions').insert({
      person_id: person.id,
      title: occTitle.trim(),
      occasion_date: occDate,
      source: 'manual',
    })
    if (occError) {
      console.error('Occasion insert error:', occError)
      return
    }
    setOccTitle('')
    setOccDate('')
    setShowAddOccasion(false)
    fetchOccasions()
  }

  const handleDeleteOccasion = async (id: string) => {
    await supabase.from('occasions').delete().eq('id', id)
    fetchOccasions()
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
        <Link to={`/people/${person.id}`} className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800">{person.name}</p>
          <p className="text-xs text-stone-500">
            {person.closeness === 'very_close' ? 'خیلی نزدیک' : person.closeness === 'close' ? 'نزدیک' : 'آشنا'}
            {occasions.length > 0 && ` • ${occasions.length} مناسبت`}
          </p>
          {nearestOccasion && nearestDays !== null && (
            <p className="text-xs mt-0.5 font-medium text-primary-600">
              {nearestDays === 0 ? `${nearestOccasion.title} - امروز!` :
               nearestDays === 1 ? `${nearestOccasion.title} - فردا` :
               nearestDays > 0 ? `${nearestOccasion.title} - ${nearestDays} روز دیگر` :
               `${nearestOccasion.title} - گذشته`}
            </p>
          )}
        </Link>
        <div className="flex items-center gap-1">
          {isBirthdayWindow && !isSelf && (
            <Link
              to={`/discover?person=${person.id}`}
              className="px-3 py-1.5 rounded-lg bg-error-500 text-white text-xs font-medium hover:bg-error-600 transition-colors flex items-center gap-1"
            >
              <PartyPopper size={14} /> تبریک
            </Link>
          )}
          <Link
            to={`/discover?person=${person.id}`}
            className="px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 transition-colors"
          >
            هدیه بگیر
          </Link>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Calendar size={18} className="text-stone-400" />
          </button>
          <button
            onClick={() => onDelete(person.id)}
            className="p-1.5 rounded-lg hover:bg-error-50 transition-colors"
          >
            <Trash2 size={16} className="text-stone-400" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3.5 pb-3.5 border-t border-stone-100 pt-3 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-stone-600">مناسبت‌ها</p>
            <div className="flex items-center gap-3">
              {!person.linked_user_id && (
                <button
                  onClick={() => {
                    if (person.birth_date) {
                      const d = new Date(person.birth_date)
                      setEditMonth(String(d.getMonth() + 1).padStart(2, '0'))
                      setEditDay(String(d.getDate()).padStart(2, '0'))
                    }
                    setEditingBirthday(!editingBirthday)
                  }}
                  className="text-xs text-primary-600 font-medium"
                >
                  {editingBirthday ? 'انصراف' : 'ویرایش تولد'}
                </button>
              )}
              <button
                onClick={() => setShowAddOccasion(!showAddOccasion)}
                className="text-xs text-primary-600 font-medium"
              >
                {showAddOccasion ? 'انصراف' : 'افزودن'}
              </button>
            </div>
          </div>

          {editingBirthday && !person.linked_user_id && (
            <div className="flex gap-2 mb-3 animate-slide-up">
              <select
                value={editMonth}
                onChange={(e) => setEditMonth(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              >
                <option value="">ماه</option>
                <option value="01">فروردین</option>
                <option value="02">اردیبهشت</option>
                <option value="03">خرداد</option>
                <option value="04">تیر</option>
                <option value="05">مرداد</option>
                <option value="06">شهریور</option>
                <option value="07">مهر</option>
                <option value="08">آبان</option>
                <option value="09">آذر</option>
                <option value="10">دی</option>
                <option value="11">بهمن</option>
                <option value="12">اسفند</option>
              </select>
              <select
                value={editDay}
                onChange={(e) => setEditDay(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              >
                <option value="">روز</option>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = String(i + 1).padStart(2, '0')
                  return <option key={d} value={d}>{d}</option>
                })}
              </select>
              <button
                onClick={handleSaveBirthday}
                disabled={savingBirthday || !editMonth || !editDay}
                className="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {savingBirthday ? <Loader2 size={14} className="animate-spin" /> : 'ثبت'}
              </button>
            </div>
          )}

          {showAddOccasion && (
            <div className="flex gap-2 mb-3 animate-slide-up">
              <input
                value={occTitle}
                onChange={(e) => setOccTitle(e.target.value)}
                placeholder="مثلاً تولد"
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <input
                type="date"
                value={occDate}
                onChange={(e) => setOccDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <button
                onClick={handleAddOccasion}
                className="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium"
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
                const days = daysUntil(occ.occasion_date)
                return (
                  <div key={occ.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-stone-50">
                    <div>
                      <p className="text-sm text-stone-700">{occ.title}</p>
                      <p className="text-xs text-stone-400">{formatDate(occ.occasion_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {days >= -1 && days <= 1 && (
                        <span className="text-xs text-primary-600 font-medium">
                          {days === 0 ? 'امروز' : days === 1 ? 'فردا' : 'دیروز'}
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
        </div>
      )}
    </div>
  )
}
