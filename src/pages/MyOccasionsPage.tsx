import { useEffect, useState } from 'react'
import { Calendar, Loader2, Plus, Trash2, Globe, Lock, X, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  MyOccasion,
  MyOccasionVisibility,
  composeOccasionDate,
  formatOccasionDate,
  parseMonthDay,
} from '../lib/types'
import {
  createLocalMyOccasion,
  deleteLocalMyOccasion,
  getLocalMyOccasions,
  upsertLocalMyOccasion,
} from '../lib/localStore'
import OccasionDateFields from '../components/OccasionDateFields'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

export default function MyOccasionsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<MyOccasion[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [repeats, setRepeats] = useState(true)
  const [visibility, setVisibility] = useState<MyOccasionVisibility>('public')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchItems()
  }, [user])

  const fetchItems = async () => {
    setLoading(true)
    const local = getLocalMyOccasions(user!.id)
    if (user!.id.startsWith('local-')) {
      setItems(local)
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('my_occasions')
        .select('*')
        .eq('owner_user_id', user!.id)
        .order('occasion_date', { ascending: true })
      setItems(data && data.length > 0 ? data : local)
    } catch {
      setItems(local)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setMonth('')
    setDay('')
    setRepeats(true)
    setVisibility('public')
    setShowAdd(false)
    setEditingId(null)
  }

  const startEdit = (item: MyOccasion) => {
    setEditingId(item.id)
    setTitle(item.title)
    const parsed = parseMonthDay(item.occasion_date)
    setMonth(parsed.month)
    setDay(parsed.day)
    setRepeats(item.repeats_yearly)
    setVisibility(item.visibility)
    setShowAdd(true)
  }

  const handleSave = async () => {
    if (!user || !title.trim() || !month || !day) return
    setSaving(true)
    const occasionDate = composeOccasionDate(month, day)
    if (editingId) {
      const existing = items.find(i => i.id === editingId)
      if (!existing) {
        setSaving(false)
        return
      }
      const updated: MyOccasion = {
        ...existing,
        title: title.trim(),
        occasion_date: occasionDate,
        repeats_yearly: repeats,
        visibility,
        updated_at: new Date().toISOString(),
      }
      upsertLocalMyOccasion(updated)
      if (!user.id.startsWith('local-')) {
        try {
          await supabase.from('my_occasions').update({
            title: updated.title,
            occasion_date: updated.occasion_date,
            repeats_yearly: updated.repeats_yearly,
            visibility: updated.visibility,
            updated_at: updated.updated_at,
          }).eq('id', existing.id)
        } catch {
          // local fallback
        }
      }
    } else {
      const payload = {
        owner_user_id: user.id,
        title: title.trim(),
        occasion_date: occasionDate,
        repeats_yearly: repeats,
        visibility,
      }
      createLocalMyOccasion(payload)
      if (!user.id.startsWith('local-')) {
        try {
          await supabase.from('my_occasions').insert(payload)
        } catch {
          // local fallback
        }
      }
    }
    setSaving(false)
    resetForm()
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    deleteLocalMyOccasion(id)
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('my_occasions').delete().eq('id', id)
      } catch {
        // local fallback
      }
    }
    fetchItems()
  }

  const toggleVisibility = async (item: MyOccasion) => {
    const nextVisibility: MyOccasionVisibility = item.visibility === 'public' ? 'very_close' : 'public'
    const updated = { ...item, visibility: nextVisibility, updated_at: new Date().toISOString() }
    upsertLocalMyOccasion(updated)
    if (!user!.id.startsWith('local-')) {
      try {
        await supabase.from('my_occasions').update({ visibility: nextVisibility, updated_at: updated.updated_at }).eq('id', item.id)
      } catch {
        // local fallback
      }
    }
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader
        title="مناسبت‌های من"
        subtitle={`${items.length} مورد`}
        back
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
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
            icon={<Calendar size={32} />}
            title="هنوز مناسبتی ثبت نشده"
            description="مناسبت‌هایی که می‌خواهید دیگران ببینند را اضافه کنید"
            action={
              <button
                onClick={() => setShowAdd(true)}
                className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
              >
                افزودن مناسبت
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-stone-100">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{item.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{formatOccasionDate(item)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(item)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-50 text-xs text-stone-600"
                  >
                    {item.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                    {item.visibility === 'public' ? 'همه' : 'خیلی نزدیک'}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg text-stone-300 hover:text-primary-500"
                    aria-label={`ویرایش ${item.title}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-stone-300 hover:text-error-500"
                    aria-label={`حذف ${item.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[60] flex items-end justify-center" onClick={resetForm}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">{editingId ? 'ویرایش مناسبت' : 'افزودن مناسبت'}</h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً سالگرد ازدواج"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
              />
              <OccasionDateFields
                month={month}
                day={day}
                onMonth={setMonth}
                onDay={setDay}
                repeats={repeats}
                onRepeats={setRepeats}
              />
              <div>
                <p className="text-sm text-stone-600 mb-2">چه کسانی ببینند؟</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      visibility === 'public' ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    همه
                  </button>
                  <button
                    onClick={() => setVisibility('very_close')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      visibility === 'very_close' ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    افراد خیلی نزدیک
                  </button>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !month || !day}
                className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : editingId ? 'ذخیره تغییرات' : 'ثبت مناسبت'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
