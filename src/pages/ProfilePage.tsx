import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, ShoppingBag, Heart, Edit2, Loader2, Camera, Cake, Calendar, PartyPopper, Gift } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { formatMonthDay, Greeting } from '../lib/types'
import { getLocalGreetingsForReceiver } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'

export default function ProfilePage() {
  const { profile, user, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingBirthday, setEditingBirthday] = useState(false)
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [savingBirthday, setSavingBirthday] = useState(false)
  const [approvedGreetings, setApprovedGreetings] = useState<Greeting[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile?.birth_date) {
      const d = new Date(profile.birth_date)
      setBirthMonth(String(d.getMonth() + 1).padStart(2, '0'))
      setBirthDay(String(d.getDate()).padStart(2, '0'))
    }
  }, [profile?.birth_date])

  useEffect(() => {
    if (!user) return
    const local = getLocalGreetingsForReceiver(user.id, ['approved'])
    if (user.id.startsWith('local-')) {
      setApprovedGreetings(local)
      return
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('greetings')
          .select('*')
          .eq('receiver_user_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
        setApprovedGreetings(data && data.length > 0 ? data : local)
      } catch {
        setApprovedGreetings(local)
      }
    })()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ name: name.trim() || null })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSaveBirthday = async () => {
    if (!birthMonth || !birthDay || !user) return
    setSavingBirthday(true)
    const now = new Date()
    const monthNum = parseInt(birthMonth, 10)
    const dayNum = parseInt(birthDay, 10)
    const thisYear = now.getFullYear()
    const candidate = new Date(thisYear, monthNum - 1, dayNum)
    candidate.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    const yearToUse = candidate < now ? thisYear + 1 : thisYear
    const newDate = `${yearToUse}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    try {
      await updateProfile({ birth_date: newDate })
      setEditingBirthday(false)
    } finally {
      setSavingBirthday(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      await updateProfile({ avatar_url: dataUrl })
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title="پروفایل" />

      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-100 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.charAt(0) || <User size={32} />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="نام شما"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-lg font-bold text-stone-800 outline-none focus:border-primary-400"
                />
              ) : (
                <>
                  <h2 className="text-lg font-bold text-stone-800">{profile?.name || 'بدون نام'}</h2>
                  <p className="text-sm text-stone-500" dir="ltr">{profile?.phone_number}</p>
                </>
              )}
            </div>
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'ذخیره'}
              </button>
            ) : (
              <button
                onClick={() => { setName(profile?.name || ''); setEditing(true) }}
                className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>

          {editingBirthday ? (
            <div className="border-t border-stone-100 pt-4 mt-2">
              <label className="text-sm text-stone-600 mb-2 block flex items-center gap-1.5">
                <Cake size={16} className="text-primary-500" /> تاریخ تولد
              </label>
              <div className="flex gap-2">
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
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
                  className="flex-1 px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400"
                >
                  <option value="">روز</option>
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = String(i + 1).padStart(2, '0')
                    return <option key={d} value={d}>{d}</option>
                  })}
                </select>
                <button
                  onClick={handleSaveBirthday}
                  disabled={savingBirthday || !birthMonth || !birthDay}
                  className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {savingBirthday ? <Loader2 size={14} className="animate-spin" /> : 'ثبت'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-2">
              <div className="flex items-center gap-1.5 text-sm text-stone-600">
                <Cake size={16} className="text-primary-500" />
                {profile?.birth_date ? formatMonthDay(profile.birth_date) : 'تاریخ تولد ثبت نشده'}
              </div>
              <button
                onClick={() => setEditingBirthday(true)}
                className="text-xs text-primary-600 font-medium"
              >
                ویرایش تولد
              </button>
            </div>
          )}
        </div>

        {approvedGreetings.length > 0 && (
          <div className="mb-4">
            <h3 className="font-bold text-stone-800 mb-2 flex items-center gap-2">
              <PartyPopper size={16} className="text-error-500" />
              تبریک‌های تأییدشده
            </h3>
            <div className="space-y-2">
              {approvedGreetings.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-stone-100 p-3.5">
                  <p className="text-sm font-semibold text-stone-800">{item.sender_name}</p>
                  {item.occasion_title && <p className="text-xs text-stone-400 mt-0.5">{item.occasion_title}</p>}
                  <p className="text-sm text-stone-600 mt-1.5 leading-6">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => navigate('/shopping-list')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-100 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center">
              <ShoppingBag size={20} className="text-secondary-600" />
            </div>
            <span className="flex-1 text-right font-medium text-stone-700">لیست خرید</span>
          </button>

          <button
            onClick={() => navigate('/wishlist')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-100 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Heart size={20} className="text-primary-600" />
            </div>
            <span className="flex-1 text-right font-medium text-stone-700">لیست آرزوها</span>
          </button>

          <button
            onClick={() => navigate('/received-gifts')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-100 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center">
              <Gift size={20} className="text-success-600" />
            </div>
            <span className="flex-1 text-right font-medium text-stone-700">هدیه‌های دریافتی</span>
          </button>

          <button
            onClick={() => navigate('/my-occasions')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-100 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center">
              <Calendar size={20} className="text-secondary-600" />
            </div>
            <span className="flex-1 text-right font-medium text-stone-700">مناسبت‌های من</span>
          </button>

          <button
            onClick={() => navigate('/greetings')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-100 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-error-50 flex items-center justify-center">
              <PartyPopper size={20} className="text-error-600" />
            </div>
            <span className="flex-1 text-right font-medium text-stone-700">پیام‌های تبریک</span>
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full mt-6 flex items-center gap-3 p-4 rounded-2xl bg-white border border-error-100 hover:bg-error-50 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-error-50 flex items-center justify-center">
            <LogOut size={20} className="text-error-600" />
          </div>
          <span className="flex-1 text-right font-medium text-error-600">خروج از حساب</span>
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
