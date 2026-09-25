import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { X, ThumbsUp, Sparkles, Heart, Loader2, ShoppingBag, RotateCcw, Frown, ChevronLeft, Check } from 'lucide-react'
import { claimWishlistHold, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Occasion, MyOccasion, Product, ReactionType, REACTION_LABELS, closenessLabel, formatPrice, CLOSENESS_OPTIONS, sortPeopleByNearestOccasion } from '../lib/types'
import { getLocalPeople, addLocalWishlistItem, createLocalShoppingItem, createLocalPerson, findLocalProfileByPhone, applyLinkedAccountToPerson, getAllDisplayOccasionsForOwner, getDisplayOccasionsForPerson, getLocalOccasions, setLocalWishlistHold } from '../lib/localStore'
import { getCatalogProduct, rankProductsForDiscovery, productToCard } from '../lib/catalog'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'
import EmptyState from '../components/EmptyState'
import GiftWheel from '../components/GiftWheel'
import { sendGiftInvite } from '../lib/invite'

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
  const [ageRange, setAgeRange] = useState<string | null>(null)
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
  const [localDeck, setLocalDeck] = useState<Card[]>([])
  const [localReactions, setLocalReactions] = useState<{ product_id: string; reaction: ReactionType }[]>([])
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [pendingTheOneProductId, setPendingTheOneProductId] = useState<string | null>(null)
  const [personPromptStep, setPersonPromptStep] = useState<'ask' | 'pick' | null>(null)
  const [pickerReceiverId, setPickerReceiverId] = useState('')
  const [showAddReceiver, setShowAddReceiver] = useState(false)
  const [newReceiverName, setNewReceiverName] = useState('')
  const [newReceiverPhone, setNewReceiverPhone] = useState('')
  const [newReceiverGender, setNewReceiverGender] = useState('unknown')
  const [newReceiverCloseness, setNewReceiverCloseness] = useState('very_close')
  const [sendInvite, setSendInvite] = useState(false)
  const [savingReceiver, setSavingReceiver] = useState(false)
  const [peopleVisibleCount, setPeopleVisibleCount] = useState(10)
  const [showCardDetails, setShowCardDetails] = useState(false)
  const isLocalUser = !!user?.id.startsWith('local-')
  const PEOPLE_PAGE_SIZE = 10
  const AGE_RANGE_OPTIONS = [
    { id: 'under3', label: 'زیر ۳ سال' },
    { id: '3to7', label: '۳ تا ۷ سال' },
    { id: '8to15', label: '۸ تا ۱۵ سال' },
    { id: 'over15', label: 'بالای ۱۵ سال' },
  ]

  useEffect(() => {
    if (!user) return
    const applyPeople = (list: ClosePerson[], occasions: Occasion[]) => {
      const others = list.filter(p => p.name !== 'خودم')
      setPeople(sortPeopleByNearestOccasion(others, occasions))
      setPeopleVisibleCount(PEOPLE_PAGE_SIZE)
      if (personId && others.some(p => p.id === personId)) {
        setSelectedPerson(personId)
        setStep('budget')
      }
    }
    if (user.id.startsWith('local-')) {
      const list = getLocalPeople(user.id)
      applyPeople(list, getAllDisplayOccasionsForOwner(user.id))
      return
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('close_people')
          .select('*')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: false })
        const list = (data && data.length > 0 ? data : getLocalPeople(user.id)) as ClosePerson[]
        let occs: Occasion[] = getAllDisplayOccasionsForOwner(user.id)
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
        applyPeople(list, occs)
      } catch {
        const list = getLocalPeople(user.id)
        applyPeople(list, getAllDisplayOccasionsForOwner(user.id))
      }
    })()
  }, [user, personId])

  const startLocalSession = () => {
    const products = rankProductsForDiscovery(budgetMin, budgetMax, 20)
    if (products.length === 0) {
      setError('محصولی در این بازه قیمت پیدا نشد')
      return false
    }
    const cards = products.map((product, idx) => productToCard(product, idx + 1))
    setLocalDeck(cards)
    setLocalReactions([])
    setSession({
      session_id: crypto.randomUUID(),
      status: 'active',
      max_cards: cards.length,
      shown_cards: 0,
      cards,
    })
    setCurrentCards(cards)
    setCurrentIdx(0)
    setShowCardDetails(false)
    setStep('discovery')
    return true
  }

  const startSession = async (personOverride?: string) => {
    const receiverId = personOverride || selectedPerson
    if (personOverride) setSelectedPerson(personOverride)
    setLoading(true)
    setError('')
    if (isLocalUser) {
      startLocalSession()
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discovery-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          receiver_id: receiverId || null,
          budget_min: budgetMin,
          budget_max: budgetMax,
          age_range: ageRange,
          occasion_id: occasionId,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        startLocalSession()
        setLoading(false)
        return
      }
      const remoteCards = data.data.cards || []
      if (remoteCards.length === 0) {
        startLocalSession()
        setLoading(false)
        return
      }
      setSession(data.data)
      setCurrentCards(remoteCards)
      setCurrentIdx(0)
      setShowCardDetails(false)
      setStep('discovery')
    } catch {
      startLocalSession()
    } finally {
      setLoading(false)
    }
  }

  const markWishlistReserved = async (receiverId: string, productId: string) => {
    if (!user) return true
    const receiver = people.find(p => p.id === receiverId)
    const ownerUserId = receiver?.linked_user_id || null
    if (!ownerUserId) return true
    if (!setLocalWishlistHold(ownerUserId, productId, user.id)) return false
    if (user.id.startsWith('local-')) return true
    return claimWishlistHold(ownerUserId, productId, user.id)
  }

  const finishLocalReview = (reactions: { product_id: string; reaction: ReactionType }[]) => {
    const liked = reactions.filter(r => r.reaction === 'good')
    if (liked.length === 0) {
      setStep('failed')
      return
    }
    const items: { product: Product; best_reaction: string; score: number }[] = []
    for (const r of liked) {
      const product = getCatalogProduct(r.product_id)
      if (!product) continue
      items.push({
        product,
        best_reaction: r.reaction,
        score: 5,
      })
    }
    items.sort((a, b) => b.score - a.score)
    setReviewItems(items)
    setStep('review')
  }

  const handleLocalReaction = (reaction: ReactionType, productId: string) => {
    const nextReactions = [...localReactions, { product_id: productId, reaction }]
    setLocalReactions(nextReactions)
    if (reaction === 'the_one') {
      openPersonPrompt(productId)
      return
    }
    const nextIdx = currentIdx + 1
    if (nextIdx >= localDeck.length) {
      finishLocalReview(nextReactions)
      return
    }
    setShowCardDetails(false)
    setCurrentIdx(nextIdx)
  }

  const handleReaction = async (reaction: ReactionType) => {
    if (!session || currentIdx >= currentCards.length) return
    const card = currentCards[currentIdx]
    if (reaction === 'the_one') {
      openPersonPrompt(card.product_id)
      return
    }
    setLoading(true)

    if (isLocalUser || localDeck.length > 0) {
      handleLocalReaction(reaction, card.product_id)
      setLoading(false)
      return
    }

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
        handleLocalReaction(reaction, card.product_id)
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
        setShowCardDetails(false)
        setCurrentIdx(prev => prev + 1)
      } else if (currentIdx + 1 >= currentCards.length || currentIdx + 1 >= 20) {
        await fetchReview()
        setStep('review')
      } else {
        setShowCardDetails(false)
        setCurrentIdx(prev => prev + 1)
      }
    } catch {
      handleLocalReaction(reaction, card.product_id)
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
      .in('reaction_type', ['good'])

    if (interactions) {
      const items = interactions
        .filter((i) => i.product)
        .map((i) => ({
          product: Array.isArray(i.product) ? (i.product[0] as Product) : (i.product as Product),
          best_reaction: i.reaction_type,
          score: 5,
        }))
        .sort((a, b) => b.score - a.score)
      setReviewItems(items as typeof reviewItems)
    }
  }

  const handleRestart = () => {
    setSession(null)
    setCurrentCards([])
    setCurrentIdx(0)
    setShowCardDetails(false)
    setReviewItems([])
    setLocalDeck([])
    setLocalReactions([])
    setShopUrl(null)
    setPendingTheOneProductId(null)
    setPersonPromptStep(null)
    setShowBudgetForm(false)
    setWheelSpinning(false)
    setError('')
    setStep('budget')
  }

  const openBudgetForm = () => {
    if (wheelSpinning || loading) return
    setError('')
    setShowBudgetForm(true)
  }

  const confirmBudgetAndSpin = () => {
    if (loading || budgetMax <= budgetMin || wheelSpinning) return
    setError('')
    setShowBudgetForm(false)
    setWheelSpinning(true)
    window.setTimeout(() => {
      void startSession()
      setWheelSpinning(false)
    }, 1600)
  }

  const addToWishlist = async (productId: string) => {
    if (!user) return
    setWishlistLoading(true)
    const markAdded = () => {
      setWishlisted(prev => new Set(prev).add(productId))
      setToastMsg('به لیست خواسته‌های خودم افزوده شد')
      setTimeout(() => setToastMsg(''), 2500)
    }
    if (isLocalUser) {
      addLocalWishlistItem(user.id, productId)
      markAdded()
      setWishlistLoading(false)
      return
    }
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .insert({ owner_user_id: user.id, product_id: productId })
      if (!error) {
        markAdded()
      } else {
        addLocalWishlistItem(user.id, productId)
        markAdded()
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const resetAddReceiverForm = () => {
    setShowAddReceiver(false)
    setNewReceiverName('')
    setNewReceiverPhone('')
    setNewReceiverGender('unknown')
    setNewReceiverCloseness('very_close')
    setSendInvite(false)
  }

  const entryReceiverId = [personId, selectedPerson].find(id => !!id && people.some(p => p.id === id)) || ''

  const openPersonPrompt = (productId: string) => {
    setPendingTheOneProductId(productId)
    setPersonPromptStep(entryReceiverId ? 'pick' : 'ask')
    setPickerReceiverId(entryReceiverId)
    resetAddReceiverForm()
  }

  const closeReceiverPicker = () => {
    setPendingTheOneProductId(null)
    setPersonPromptStep(null)
    setPickerReceiverId('')
    resetAddReceiverForm()
  }

  const proceedTheOne = async (productId: string, receiverId: string | null) => {
    if (receiverId) setSelectedPerson(receiverId)
    setPendingTheOneProductId(null)
    setPersonPromptStep(null)
    setLoading(true)
    const finishLocal = async () => {
      if (receiverId) {
        const held = await markWishlistReserved(receiverId, productId)
        if (!held) {
          setToastMsg('این هدیه قبلاً رزرو شده است')
          setTimeout(() => setToastMsg(''), 2500)
          return false
        }
      }
      if (user) {
        createLocalShoppingItem({
          user_id: user.id,
          receiver_id: receiverId,
          product_id: productId,
          session_id: session?.session_id,
        })
      }
      setShopUrl(getCatalogProduct(productId)?.shop_url || null)
      setStep('success')
      return true
    }
    if (isLocalUser || localDeck.length > 0 || !session) {
      await finishLocal()
      setLoading(false)
      return
    }
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
          receiver_id: receiverId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.data?.reservation_created === false) {
          setToastMsg('این هدیه قبلاً رزرو شده است')
          setTimeout(() => setToastMsg(''), 2500)
          return
        }
        if (user) {
          createLocalShoppingItem({
            user_id: user.id,
            receiver_id: receiverId,
            product_id: productId,
            session_id: session.session_id,
          })
          if (receiverId) await markWishlistReserved(receiverId, productId)
        }
        setShopUrl(data.data.shop_url)
        setStep('success')
      } else if (data.error?.code === 'CONFLICT') {
        setToastMsg('این هدیه قبلاً رزرو شده است')
        setTimeout(() => setToastMsg(''), 2500)
      } else {
        await finishLocal()
      }
    } catch {
      await finishLocal()
    } finally {
      setLoading(false)
    }
  }

  const confirmReceiverAndReserve = async () => {
    if (!pendingTheOneProductId) return
    const productId = pendingTheOneProductId
    if (showAddReceiver) {
      const created = await addReceiverAndSelect()
      if (!created) return
      void proceedTheOne(productId, created.id)
      closeReceiverPicker()
      return
    }
    if (!pickerReceiverId) {
      setToastMsg('یک نزدیک را انتخاب کنید')
      setTimeout(() => setToastMsg(''), 2500)
      return
    }
    const receiver = people.find(p => p.id === pickerReceiverId)
    if (!receiver) {
      setToastMsg('نزدیک انتخاب‌شده یافت نشد')
      setTimeout(() => setToastMsg(''), 2500)
      return
    }
    void proceedTheOne(productId, receiver.id)
    closeReceiverPicker()
  }

  const addReceiverAndSelect = async (): Promise<ClosePerson | null> => {
    if (!user) return null
    if (!newReceiverName.trim()) {
      setToastMsg('نام را وارد کنید')
      setTimeout(() => setToastMsg(''), 2500)
      return null
    }
    setSavingReceiver(true)
    const isLocal = user.id.startsWith('local-')
    let linkedUserId: string | null = null
    let birthDateStr: string | null = null
    if (newReceiverPhone) {
      const localMatch = findLocalProfileByPhone(newReceiverPhone)
      if (localMatch) {
        linkedUserId = localMatch.id
        birthDateStr = localMatch.birth_date
      }
    }
    if (!isLocal && newReceiverPhone && !linkedUserId) {
      try {
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('id, birth_date')
          .eq('phone_number', newReceiverPhone)
          .maybeSingle()
        linkedUserId = profileMatch?.id || null
        birthDateStr = profileMatch?.birth_date || null
      } catch {
        linkedUserId = null
      }
    }
    let created: ClosePerson | null = null
    if (isLocal) {
      created = createLocalPerson({
        owner_user_id: user.id,
        linked_user_id: linkedUserId,
        name: newReceiverName.trim(),
        phone: newReceiverPhone || null,
        avatar_url: null,
        birth_date: birthDateStr,
        gender: newReceiverGender,
        closeness: newReceiverCloseness,
      })
    } else {
      try {
        const { data, error: insertError } = await supabase
          .from('close_people')
          .insert({
            owner_user_id: user.id,
            name: newReceiverName.trim(),
            phone: newReceiverPhone || null,
            birth_date: birthDateStr,
            gender: newReceiverGender,
            closeness: newReceiverCloseness,
            linked_user_id: linkedUserId,
          })
          .select()
          .single()
        if (insertError) throw insertError
        created = data
      } catch {
        created = createLocalPerson({
          owner_user_id: user.id,
          linked_user_id: linkedUserId,
          name: newReceiverName.trim(),
          phone: newReceiverPhone || null,
          avatar_url: null,
          birth_date: birthDateStr,
          gender: newReceiverGender,
          closeness: newReceiverCloseness,
        })
      }
    }
    if (!created) {
      setSavingReceiver(false)
      return null
    }
    if (linkedUserId) {
      applyLinkedAccountToPerson({ ...created, linked_user_id: linkedUserId })
    }
    const invitePhone = newReceiverPhone
    const shouldInvite = !linkedUserId && /^09\d{9}$/.test(invitePhone)
    setPeople(prev => [created!, ...prev.filter(p => p.id !== created!.id)])
    setPickerReceiverId(created.id)
    setSavingReceiver(false)
    if (shouldInvite) {
      void sendGiftInvite(invitePhone)
    }
    return created
  }

  const handleReserveFromReview = (productId: string) => {
    openPersonPrompt(productId)
  }

  const currentCard = currentCards[currentIdx]
  const totalCards = session?.max_cards || currentCards.length || 20
  const progress = session ? (currentIdx / Math.max(totalCards, 1)) * 100 : 0

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
          <GiftWheel
            spinning={wheelSpinning}
            disabled={loading}
            onSpin={openBudgetForm}
          />
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
              const visiblePeople = people.slice(0, peopleVisibleCount)
              return (
                <div className="space-y-2">
                  {visiblePeople.map(person => (
                    <button
                      key={person.id}
                      onClick={() => { setSelectedPerson(person.id); setStep('budget') }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border bg-white border-stone-100 hover:border-primary-300 hover:shadow-md transition-all text-right"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 bg-gradient-to-br from-primary-200 to-primary-400">
                        {person.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-stone-800">{person.name}</p>
                        <p className="text-xs text-stone-500">{closenessLabel(person.closeness)}</p>
                      </div>
                      <ChevronLeft size={20} className="text-stone-400" />
                    </button>
                  ))}
                  {people.length > peopleVisibleCount && (
                    <button
                      type="button"
                      onClick={() => setPeopleVisibleCount(count => count + PEOPLE_PAGE_SIZE)}
                      className="w-full py-3 rounded-2xl bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors"
                    >
                      دیدن موارد بیشتر
                    </button>
                  )}
                </div>
              )
            })()
          )}
        </div>
      )}

      {step === 'budget' && (
        <div className="px-4 py-4 animate-fade-in">
          <GiftWheel
            spinning={wheelSpinning}
            disabled={loading}
            onSpin={openBudgetForm}
          />
        </div>
      )}

      {step === 'discovery' && currentCard && (
        <div className="flex flex-col items-center px-4 py-4 animate-fade-in">
          <div className="w-full max-w-sm mb-3">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
              <span>کارت {currentIdx + 1} از {totalCards}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden bg-stone-100 shadow-xl animate-slide-up">
            <button
              type="button"
              onClick={() => setShowCardDetails(v => !v)}
              className="absolute inset-0 z-0 text-right"
            >
              {currentCard.image_url ? (
                <img src={currentCard.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={40} className="text-stone-300" />
                </span>
              )}
            </button>
            {showCardDetails && (
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                <h3 className="font-bold text-lg leading-tight mb-2">{currentCard.title}</h3>
                <p className="text-lg font-bold mb-3">{formatPrice(currentCard.price.amount)}</p>
                {currentCard.shop_url && (
                  <a
                    href={currentCard.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto inline-flex items-center justify-center gap-1.5 self-end px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium"
                  >
                    <ShoppingBag size={14} /> خرید
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-sm mt-6 grid grid-cols-3 gap-2">
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
              icon={<Check size={24} />}
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
        <div className="flex flex-col items-center justify-center py-10 px-6 animate-pop">
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
          <p className="text-sm text-stone-500 mb-6 text-center">محصول در لیست خرید شما رزرو شد</p>

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
            className="px-6 py-3 rounded-sm bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors mb-6"
          >
            لیست خرید من
          </button>
          <div className="w-full max-w-sm">
            <GiftWheel
              spinning={wheelSpinning}
              disabled={loading}
              onSpin={openBudgetForm}
            />
          </div>
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
                        <ThumbsUp size={14} className="text-secondary-500" />
                        <span className="text-xs text-stone-500">خوبه</span>
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-50 px-5 flex justify-center pointer-events-none">
          <div className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium shadow-lg animate-slide-up">
            {toastMsg}
          </div>
        </div>
      )}

      {showBudgetForm && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[60] flex items-end justify-center" onClick={() => setShowBudgetForm(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">بودجه</h2>
              <button type="button" onClick={() => setShowBudgetForm(false)} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">بازه قیمت هدیه را مشخص کنید</p>
            <div className="space-y-4 mb-4">
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
              <div>
                <p className="text-sm text-stone-600 mb-2">بازه سنی</p>
                <div className="flex gap-2 flex-wrap">
                  {AGE_RANGE_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAgeRange(option.id === ageRange ? null : option.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        ageRange === option.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-stone-100 text-stone-600 hover:bg-primary-50 hover:text-primary-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={confirmBudgetAndSpin}
              disabled={loading || budgetMax <= budgetMin}
              className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'شروع کشف هدیه'}
            </button>
          </div>
        </div>
      )}

      {pendingTheOneProductId && personPromptStep && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[60] flex items-end justify-center" onClick={closeReceiverPicker}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {personPromptStep === 'ask' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-stone-800">آیا شخص خاصی را در نظر داری؟</h2>
                  <button type="button" onClick={closeReceiverPicker} className="p-1.5 rounded-lg hover:bg-stone-100">
                    <X size={20} className="text-stone-500" />
                  </button>
                </div>
                <p className="text-sm text-stone-600 mb-5">اگر نه، آیتم بدون نام شخص در لیست خرید ذخیره می‌شود</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pendingTheOneProductId) return
                      void proceedTheOne(pendingTheOneProductId, null)
                    }}
                    className="py-3.5 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 transition-all"
                  >
                    نه
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonPromptStep('pick')}
                    className="py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-all"
                  >
                    بله
                  </button>
                </div>
                {pendingTheOneProductId && (
                  <button
                    type="button"
                    onClick={() => { void addToWishlist(pendingTheOneProductId) }}
                    disabled={wishlistLoading || wishlisted.has(pendingTheOneProductId)}
                    className="w-full mt-3 py-3.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {wishlisted.has(pendingTheOneProductId) ? <Check size={18} /> : <Heart size={18} />}
                    {wishlisted.has(pendingTheOneProductId) ? 'به لیست خواسته‌های خودم افزوده شد' : 'افزودن به لیست خواسته‌های خودم'}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-stone-800">این هدیه برای کیست؟</h2>
                  <button type="button" onClick={closeReceiverPicker} className="p-1.5 rounded-lg hover:bg-stone-100">
                    <X size={20} className="text-stone-500" />
                  </button>
                </div>
                <p className="text-sm text-stone-600 mb-4">یکی از نزدیکان را انتخاب کنید</p>
                <div className="mb-4 space-y-3">
                  <label className="text-sm text-stone-600 mb-1 block">انتخاب نزدیک</label>
                  <select
                    value={pickerReceiverId}
                    onChange={(e) => setPickerReceiverId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white"
                  >
                    <option value="">یک نفر را انتخاب کنید</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({closenessLabel(p.closeness)})
                      </option>
                    ))}
                  </select>
                  {!showAddReceiver && (
                    <button
                      type="button"
                      onClick={() => setShowAddReceiver(true)}
                      className="text-sm text-primary-600 font-medium"
                    >
                      افزودن نزدیک جدید
                    </button>
                  )}
                  {showAddReceiver && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-stone-600 mb-1 block">نام *</label>
                        <input
                          value={newReceiverName}
                          onChange={(e) => setNewReceiverName(e.target.value)}
                          placeholder="مثلاً مریم"
                          className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-stone-600 mb-1 block">شماره موبایل (اختیاری)</label>
                        <input
                          type="tel"
                          value={newReceiverPhone}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '').slice(0, 11)
                            setNewReceiverPhone(next)
                            if (!next) setSendInvite(false)
                          }}
                          placeholder="09xxxxxxxxx"
                          dir="ltr"
                          className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                        />
                        {newReceiverPhone.length > 0 && (
                          <label className="mt-2 flex items-start gap-2.5 p-3 rounded-xl bg-primary-50 border border-primary-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sendInvite}
                              onChange={(e) => setSendInvite(e.target.checked)}
                              disabled={!/^09\d{9}$/.test(newReceiverPhone)}
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
                              type="button"
                              onClick={() => setNewReceiverGender(g.v)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                newReceiverGender === g.v ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
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
                              onClick={() => setNewReceiverCloseness(c.v)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                newReceiverCloseness === c.v ? 'bg-primary-500 text-white' : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {c.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { void confirmReceiverAndReserve() }}
                  disabled={loading || savingReceiver}
                  className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all"
                >
                  تأیید
                </button>
                {pendingTheOneProductId && (
                  <button
                    type="button"
                    onClick={() => { void addToWishlist(pendingTheOneProductId) }}
                    disabled={wishlistLoading || wishlisted.has(pendingTheOneProductId)}
                    className="w-full mt-3 py-3.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {wishlisted.has(pendingTheOneProductId) ? <Check size={18} /> : <Heart size={18} />}
                    {wishlisted.has(pendingTheOneProductId) ? 'به لیست خواسته‌های خودم افزوده شد' : 'افزودن به لیست خواسته‌های خودم'}
                  </button>
                )}
              </>
            )}
          </div>
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
