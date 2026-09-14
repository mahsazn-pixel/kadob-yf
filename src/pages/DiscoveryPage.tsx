import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X, ThumbsUp, Sparkles, Heart, Loader2, ShoppingBag, RotateCcw, Frown, ChevronLeft, Plus, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Product, ReactionType, REACTION_LABELS, formatPrice } from '../lib/types'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'
import EmptyState from '../components/EmptyState'

interface Card {
  id: string
  product_id: string
  position: number
  image_url: string | null
  title: string
  price: { amount: number; currency: string }
  merchant: { name: string | null }
  shop_url: string | null
  category: string | null
  availability: string
}

interface SessionData {
  session_id: string
  status: string
  max_cards: number
  shown_cards: number
  cards: Card[]
}

export default function DiscoveryPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const personId = params.get('person')
  const occasionId = params.get('occasion')

  const [people, setPeople] = useState<ClosePerson[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string | null>(personId)
  const [budgetMin, setBudgetMin] = useState(500000)
  const [budgetMax, setBudgetMax] = useState(5000000)
  const [step, setStep] = useState<'select' | 'budget' | 'discovery' | 'review' | 'failed' | 'success'>('select')
  const [session, setSession] = useState<SessionData | null>(null)
  const [currentCards, setCurrentCards] = useState<Card[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewItems, setReviewItems] = useState<{ product: Product; best_reaction: string; score: number }[]>([])
  const [shopUrl, setShopUrl] = useState<string | null>(null)
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set())
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('close_people')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPeople(data || [])
        if (personId) {
          setSelectedPerson(personId)
          setStep('budget')
        }
      })
  }, [user, personId])

  const startSession = async () => {
    if (!selectedPerson) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discovery-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          receiver_id: selectedPerson,
          budget_min: budgetMin,
          budget_max: budgetMax,
          occasion_id: occasionId,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || 'خطا در شروع جلسه')
        setLoading(false)
        return
      }
      setSession(data.data)
      setCurrentCards(data.data.cards || [])
      setCurrentIdx(0)
      setStep('discovery')
    } catch {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  const handleReaction = async (reaction: ReactionType) => {
    if (!session || currentIdx >= currentCards.length) return
    const card = currentCards[currentIdx]
    setLoading(true)

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discovery-reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: card.product_id,
          reaction,
          session_id: session.session_id,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || 'خطا در ثبت واکنش')
        setLoading(false)
        return
      }

      const result = data.data
      if (result.session_status === 'completed') {
        setShopUrl(result.shop_url)
        setStep('success')
      } else if (result.session_status === 'review') {
        await fetchReview()
        setStep('review')
      } else if (result.session_status === 'failed') {
        setStep('failed')
      } else if (result.next_card) {
        setCurrentCards(prev => [...prev, result.next_card])
        setCurrentIdx(prev => prev + 1)
      } else {
        // No more cards but still active — check if we've seen all
        if (currentIdx + 1 >= 20) {
          await fetchReview()
          setStep('review')
        } else {
          setCurrentIdx(prev => prev + 1)
        }
      }
    } catch {
      setError('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  const fetchReview = async () => {
    if (!session) return
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('reaction_type, product_id, product:products(*)')
      .eq('session_id', session.session_id)
      .in('reaction_type', ['good', 'great'])

    if (interactions) {
      const items = interactions
        .filter((i) => i.product)
        .map((i) => ({
          product: Array.isArray(i.product) ? (i.product[0] as Product) : (i.product as Product),
          best_reaction: i.reaction_type,
          score: i.reaction_type === 'great' ? 8 : 5,
        }))
        .sort((a, b) => b.score - a.score)
      setReviewItems(items as typeof reviewItems)
    }
  }

  const handleRestart = () => {
    setSession(null)
    setCurrentCards([])
    setCurrentIdx(0)
    setReviewItems([])
    setStep('budget')
  }

  const addToWishlist = async (productId: string) => {
    if (!user) return
    setWishlistLoading(true)
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .insert({ owner_user_id: user.id, product_id: productId })
      if (!error) {
        setWishlisted(prev => new Set(prev).add(productId))
        setToastMsg('به لیست خواسته‌ها افزوده شد')
        setTimeout(() => setToastMsg(''), 2500)
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleReserveFromReview = async (productId: string) => {
    if (!session) return
    setLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discovery-reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          reaction: 'the_one',
          session_id: session.session_id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShopUrl(data.data.shop_url)
        setStep('success')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentCard = currentCards[currentIdx]
  const progress = session ? ((currentIdx) / 20) * 100 : 0

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <PageHeader title="کشف هدیه" back={step !== 'discovery'} />

      {error && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm">
          {error}
        </div>
      )}

      {step === 'select' && (
        <div className="px-4 py-4 animate-fade-in">
          <p className="text-sm text-stone-500 mb-4">چی دوست داری هدیه بگیری؟</p>
          {people.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={32} />}
              title="ابتدا نزدیکان را اضافه کنید"
              description="برای شروع کشف هدیه، حداقل یک نفر را اضافه کنید"
              action={
                <button
                  onClick={() => navigate('/people')}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium"
                >
                  افزودن نزدیک
                </button>
              }
            />
          ) : (
            (() => {
              const selfPerson = people.find(p => p.name === 'خودم')
              const others = people.filter(p => p.name !== 'خودم')
              const renderPerson = (person: ClosePerson, self: boolean) => (
                <button
                  key={person.id}
                  onClick={() => { setSelectedPerson(person.id); setStep('budget') }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border hover:shadow-md transition-all text-right ${
                    self
                      ? 'bg-primary-50 border-primary-300 hover:border-primary-400'
                      : 'bg-white border-stone-100 hover:border-primary-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 ${
                    self ? 'bg-gradient-to-br from-primary-500 to-primary-700' : 'bg-gradient-to-br from-primary-200 to-primary-400'
                  }`}>
                    {person.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-800">{person.name}</p>
                    <p className="text-xs text-stone-500">
                      {self ? 'هدیه برای خودم' : person.closeness === 'very_close' ? 'خیلی نزدیک' : person.closeness === 'close' ? 'نزدیک' : 'آشنا'}
                    </p>
                  </div>
                  <ChevronLeft size={20} className="text-stone-400" />
                </button>
              )
              return (
                <>
                  {selfPerson && (
                    <div className="mb-5">
                      {renderPerson(selfPerson, true)}
                    </div>
                  )}
                  {others.length > 0 && (
                    <div className="space-y-2">
                      {others.map(person => renderPerson(person, false))}
                    </div>
                  )}
                </>
              )
            })()
          )}
        </div>
      )}

      {step === 'budget' && (
        <div className="px-4 py-4 animate-fade-in">
          <h2 className="font-bold text-stone-800 mb-1">بودجه</h2>
          <p className="text-sm text-stone-500 mb-4">بازه قیمت هدیه را مشخص کنید</p>

          <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-4">
            <div>
              <label className="text-sm text-stone-600 mb-1 block">حداقل قیمت (تومان)</label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-stone-600 mb-1 block">حداکثر قیمت (تومان)</label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { min: 500000, max: 2000000, label: '۵۰۰ هزار - ۲ میلیون' },
                { min: 1000000, max: 5000000, label: '۱ - ۵ میلیون' },
                { min: 2000000, max: 10000000, label: '۲ - ۱۰ میلیون' },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => { setBudgetMin(preset.min); setBudgetMax(preset.max) }}
                  className="px-3 py-2 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            disabled={loading || budgetMax <= budgetMin}
            className="w-full mt-4 py-3.5 rounded-xl bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'شروع کشف هدیه'}
          </button>
        </div>
      )}

      {step === 'discovery' && currentCard && (
        <div className="flex flex-col items-center px-4 py-4 animate-fade-in">
          <div className="w-full max-w-sm mb-3">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
              <span>کارت {currentIdx + 1} از ۲۰</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden bg-stone-100 shadow-xl animate-slide-up">
            {currentCard.image_url && (
              <img src={currentCard.image_url} alt={currentCard.title} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button
              onClick={() => addToWishlist(currentCard.product_id)}
              disabled={wishlistLoading || wishlisted.has(currentCard.product_id)}
              className="absolute top-3 left-3 w-10 h-10 rounded-full bg-neutral-900 backdrop-blur-sm flex items-center justify-center text-white hover:bg-neutral-800 transition-all active:scale-90 disabled:opacity-70"
            >
              {wishlisted.has(currentCard.product_id) ? (
                <Check size={20} className="text-success-400" />
              ) : (
                <Plus size={22} />
              )}
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <p className="text-xs opacity-80 mb-1">{currentCard.merchant?.name}</p>
              <h3 className="font-bold text-lg leading-tight mb-2">{currentCard.title}</h3>
              <p className="text-lg font-bold">{formatPrice(currentCard.price.amount)}</p>
            </div>
          </div>

          <div className="w-full max-w-sm mt-6 grid grid-cols-4 gap-2">
            <ReactionButton
              icon={<X size={24} />}
              label={REACTION_LABELS.no}
              onClick={() => handleReaction('no')}
              color="bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 border-primary-300"
              activeColor="bg-gradient-to-br from-primary-400 to-primary-500 text-white border-primary-500"
              disabled={loading}
            />
            <ReactionButton
              icon={<ThumbsUp size={24} />}
              label={REACTION_LABELS.good}
              onClick={() => handleReaction('good')}
              color="bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 border-primary-300"
              activeColor="bg-gradient-to-br from-primary-400 to-primary-500 text-white border-primary-500"
              disabled={loading}
            />
            <ReactionButton
              icon={<Sparkles size={24} />}
              label={REACTION_LABELS.great}
              onClick={() => handleReaction('great')}
              color="bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 border-primary-300"
              activeColor="bg-gradient-to-br from-primary-400 to-primary-500 text-white border-primary-500"
              disabled={loading}
            />
            <ReactionButton
              icon={<Heart size={24} />}
              label={REACTION_LABELS.the_one}
              onClick={() => handleReaction('the_one')}
              color="bg-gradient-to-br from-primary-200 to-primary-300 text-primary-800 border-primary-400"
              activeColor="bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-600"
              disabled={loading}
            />
          </div>

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
              <Loader2 size={16} className="animate-spin" /> در حال ثبت...
            </div>
          )}
        </div>
      )}

      {step === 'discovery' && !currentCard && (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <Loader2 size={32} className="animate-spin text-stone-400" />
          <p className="text-sm text-stone-500 mt-3">در حال آماده‌سازی کارت‌ها...</p>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center justify-center py-16 px-6 animate-pop">
          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 80 80" className="animate-arrow-heart absolute" style={{ animationDelay: '0s' }}>
                <line x1="5" y1="70" x2="55" y2="30" stroke="#DE2500" strokeWidth="3" strokeLinecap="round" />
                <polygon points="55,30 48,28 52,36" fill="#DE2500" />
                <line x1="40" y1="65" x2="52" y2="35" stroke="#DE2500" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Heart size={56} className="text-error-500 fill-error-500 animate-heart-burst" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-1">عالی! هدیه انتخاب شد</h2>
          <p className="text-sm text-stone-500 mb-6 text-center">محصول به لیست خرید شما اضافه شد</p>

          {shopUrl && (
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-sm bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors mb-3"
            >
              مشاهده و خرید محصول
            </a>
          )}
          <button
            onClick={() => navigate('/shopping-list')}
            className="px-6 py-3 rounded-sm bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
          >
            لیست خرید من
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="px-4 py-4 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles size={32} className="text-secondary-600" />
            </div>
            <h2 className="text-lg font-bold text-stone-800">بهترین‌های این دور</h2>
            <p className="text-sm text-stone-500 mt-1">از بین کارت‌هایی که پسندیدید، یکی را انتخاب کنید</p>
          </div>

          {reviewItems.length === 0 ? (
            <p className="text-center text-sm text-stone-400 py-8">موردی یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {item.product.image_url && (
                      <img src={item.product.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 text-sm line-clamp-2">{item.product.title}</p>
                      <p className="text-sm text-primary-600 font-bold mt-1">{formatPrice(item.product.price_amount)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {item.best_reaction === 'great' ? (
                          <Sparkles size={14} className="text-success-500" />
                        ) : (
                          <ThumbsUp size={14} className="text-secondary-500" />
                        )}
                        <span className="text-xs text-stone-500">
                          {item.best_reaction === 'great' ? 'عالی' : 'خوبه'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReserveFromReview(item.product.id)}
                    disabled={loading}
                    className="w-full py-2.5 bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Heart size={16} /> این را انتخاب می‌کنم
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleRestart}
            className="w-full mt-4 py-3 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} /> شروع دوباره
          </button>
        </div>
      )}

      {step === 'failed' && (
        <div className="flex flex-col items-center justify-center py-16 px-6 animate-pop">
          <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Frown size={40} className="text-stone-400" />
          </div>
          <h2 className="text-lg font-bold text-stone-700 mb-1">ای بابا… این بار نشد :(</h2>
          <p className="text-sm text-stone-500 mb-6 text-center">هیچ کدام از کارت‌ها پسندیده نشد. می‌خواهی دوباره امتحان کنی؟</p>
          <button
            onClick={handleRestart}
            className="px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={18} /> شروع دوباره
          </button>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium shadow-lg animate-slide-up">
          {toastMsg}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function ReactionButton({
  icon, label, onClick, color, activeColor, disabled
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
  activeColor: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 ${color} hover:${activeColor} active:scale-95 disabled:opacity-50 transition-all`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </button>
  )
}
