import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Gift, Trash2, Loader2, PartyPopper, Heart, Edit2, ShoppingBag, Check, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ClosePerson, Occasion, Product, MyOccasion, Greeting, ReceivedGift, CLOSENESS_OPTIONS, closenessLabel, formatMonthDay, daysUntilOccasion, composeOccasionDate, formatPrice, parseMonthDay } from '../lib/types'
import OccasionDateFields from '../components/OccasionDateFields'
import GreetingModal from '../components/GreetingModal'
import { getAllLocalPeople, getLocalPeople, getLocalOccasions, createLocalOccasion, deleteLocalOccasion, upsertLocalOccasion, upsertLocalPerson, createLocalPerson, findLocalProfileByPhone, getLocalGreetingsForPerson, getLocalGreetingsForReceiver, getLocalProfile, getLocalWishlist, getLocalShoppingItems, createLocalShoppingItem, updateLocalShoppingItem, getDisplayOccasionsForPerson, applyLinkedAccountToPerson, isOwnOccasion, markGiftGiven, getLocalReceivedGifts, addLocalWishlistItem } from '../lib/localStore'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'
import { sendGiftInvite } from '../lib/invite'

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [person, setPerson] = useState<ClosePerson | null>(null)
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [wishlistItems, setWishlistItems] = useState<{ id?: string; product_id?: string; product: Product | null; visibility: string }[]>([])
  const [shopStatus, setShopStatus] = useState<Record<string, { id: string; status: string }>>({})
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null)
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
  const [showGreeting, setShowGreeting] = useState(false)
  const [approvedGreetings, setApprovedGreetings] = useState<Greeting[]>([])
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGift[]>([])
  const [toastMsg, setToastMsg] = useState('')
  const [showAllOccasions, setShowAllOccasions] = useState(false)
  const [showAllGreetings, setShowAllGreetings] = useState(false)
  const [showAllWishlist, setShowAllWishlist] = useState(false)
  const [showAllReceived, setShowAllReceived] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
  const [previewSource, setPreviewSource] = useState<'wishlist' | 'received' | null>(null)
  const [ownWishlistIds, setOwnWishlistIds] = useState<Set<string>>(new Set())
  const [wishlistSaving, setWishlistSaving] = useState(false)
  const [closePeople, setClosePeople] = useState<ClosePerson[]>([])
  const [reserveTargetProduct, setReserveTargetProduct] = useState<Product | null>(null)
  const [selectedReceiverId, setSelectedReceiverId] = useState('')
  const [reserveForOther, setReserveForOther] = useState(false)
  const [showAddReceiver, setShowAddReceiver] = useState(false)
  const [newReceiverName, setNewReceiverName] = useState('')
  const [newReceiverPhone, setNewReceiverPhone] = useState('')
  const [newReceiverGender, setNewReceiverGender] = useState('unknown')
  const [newReceiverCloseness, setNewReceiverCloseness] = useState('very_close')
  const [sendInvite, setSendInvite] = useState(false)
  const [savingReceiver, setSavingReceiver] = useState(false)

  const asProduct = (value: Product | Product[] | null | undefined): Product | null => {
    if (!value) return null
    return Array.isArray(value) ? value[0] || null : value
  }

  const wishlistKeys = (item: { id?: string; product_id?: string; product: Product | Product[] | null }) => {
    const product = asProduct(item.product)
    return [item.product_id, product?.id, item.id].filter(Boolean) as string[]
  }

  const resolveWishlistItem = (item: { id?: string; product_id?: string; product: Product | Product[] | null }) => {
    const product = asProduct(item.product)
    const productId = item.product_id || product?.id || item.id || ''
    return { product, productId }
  }

  const statusForItem = (item: { id?: string; product_id?: string; product: Product | null }) => {
    for (const key of wishlistKeys(item)) {
      if (shopStatus[key]) return shopStatus[key]
    }
    return undefined
  }

  const writeStatus = (item: { id?: string; product_id?: string; product: Product | null }, record: { id: string; status: string }) => {
    setShopStatus(prev => {
      const next = { ...prev }
      for (const key of wishlistKeys(item)) next[key] = record
      return next
    })
  }

  const showToast = (message: string) => {
    setToastMsg(message)
    window.setTimeout(() => setToastMsg(''), 2500)
  }

  useEffect(() => {
    if (!user || !id) return
    fetchData()
  }, [user, id])

  const fetchData = async () => {
    setLoading(true)
    const applyLocal = () => {
      const personRec = getAllLocalPeople().find(p => p.id === id!) || null
      const synced = personRec ? applyLinkedAccountToPerson(personRec) : null
      setPerson(synced?.person || personRec)
      setOccasions(synced?.occasions || (personRec ? getDisplayOccasionsForPerson(personRec) : []))
      if (personRec?.linked_user_id) {
        const linked = getLocalProfile(personRec.linked_user_id)
        setLinkedProfile(linked ? { name: linked.name, avatar_url: linked.avatar_url, birth_date: linked.birth_date } : null)
        const closeness = personRec.closeness
        const visibleWish = getLocalWishlist(personRec.linked_user_id).filter(item => (
          item.visibility === 'public' || closeness === 'very_close'
        ))
        setWishlistItems(visibleWish.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product: asProduct(item.product),
          visibility: item.visibility,
        })))
        setReceivedGifts(getLocalReceivedGifts(personRec.linked_user_id))
      } else {
        setLinkedProfile(null)
        setWishlistItems([])
        setReceivedGifts([])
      }
      const personGreetings = getLocalGreetingsForPerson(id!, ['approved'])
      const linkedGreetings = personRec?.linked_user_id ? getLocalGreetingsForReceiver(personRec.linked_user_id, ['approved']) : []
      const selfGreetings = personRec?.name === 'خودم' ? getLocalGreetingsForReceiver(user!.id, ['approved']) : []
      const merged = [...personGreetings]
      for (const g of [...linkedGreetings, ...selfGreetings]) {
        if (!merged.some(p => p.id === g.id)) merged.push(g)
      }
      setApprovedGreetings(merged)
      const shopping = getLocalShoppingItems(user!.id).filter(i => i.receiver_id === id || i.receiver_id === personRec?.id)
      const map: Record<string, { id: string; status: string }> = {}
      for (const s of shopping) {
        if (s.product_id) map[s.product_id] = { id: s.id, status: s.status }
        if (s.id) map[s.id] = { id: s.id, status: s.status }
      }
      setShopStatus(map)
      setOwnWishlistIds(new Set(getLocalWishlist(user!.id).map(item => item.product_id)))
      setClosePeople(getLocalPeople(user!.id).filter(p => p.name !== 'خودم'))
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

      if (personRec?.linked_user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, avatar_url, birth_date')
          .eq('id', personRec.linked_user_id)
          .maybeSingle()
        setLinkedProfile(profileData as typeof linkedProfile)
        if (profileData?.birth_date && personRec.birth_date !== profileData.birth_date) {
          setPerson({ ...personRec, birth_date: profileData.birth_date })
        }

        const { data: wishData } = await supabase
          .from('wishlist_items')
          .select('*, product:products(*)')
          .eq('owner_user_id', personRec.linked_user_id)
          .in('visibility', ['public', 'private'])
          .order('created_at', { ascending: false })
        setWishlistItems(((wishData || []) as { id?: string; product_id?: string; product: Product | Product[] | null; visibility: string }[]).map(item => ({
          id: item.id,
          product_id: item.product_id,
          product: asProduct(item.product),
          visibility: item.visibility,
        })))
        setReceivedGifts(getLocalReceivedGifts(personRec.linked_user_id))
        const visibilities = personRec.closeness === 'very_close' ? ['public', 'very_close'] : ['public']
        const { data: sharedData } = await supabase
          .from('my_occasions')
          .select('*')
          .eq('owner_user_id', personRec.linked_user_id)
          .in('visibility', visibilities)
          .order('occasion_date', { ascending: true })
        setOccasions(getDisplayOccasionsForPerson(personRec, {
          own: (occasionsData as Occasion[] | null) || getLocalOccasions(id!),
          shared: (sharedData || []) as MyOccasion[],
          linkedBirthDate: profileData?.birth_date || null,
        }))
        const { data: greetingData } = await supabase
          .from('greetings')
          .select('*')
          .eq('status', 'approved')
          .or(`receiver_person_id.eq.${id},receiver_user_id.eq.${personRec.linked_user_id}`)
        setApprovedGreetings((greetingData || []) as Greeting[])
        const { data: shopData } = await supabase
          .from('shopping_list_items')
          .select('id, product_id, status')
          .eq('user_id', user!.id)
          .eq('receiver_id', id!)
        const map: Record<string, { id: string; status: string }> = {}
        for (const s of (shopData || []) as { id: string; product_id: string; status: string }[]) {
          if (s.product_id) map[s.product_id] = { id: s.id, status: s.status }
        }
        if (Object.keys(map).length === 0) {
          const shopping = getLocalShoppingItems(user!.id).filter(i => i.receiver_id === id)
          for (const s of shopping) {
            if (s.product_id) map[s.product_id] = { id: s.id, status: s.status }
          }
        }
        setShopStatus(map)
        setOwnWishlistIds(new Set(getLocalWishlist(user!.id).map(item => item.product_id)))
        setClosePeople(getLocalPeople(user!.id).filter(p => p.name !== 'خودم'))
      } else {
        setLinkedProfile(null)
        setWishlistItems([])
        setReceivedGifts([])
        setOccasions((occasionsData as Occasion[] | null) || getLocalOccasions(id!))
        setApprovedGreetings(getLocalGreetingsForPerson(id!, ['approved']))
        setShopStatus({})
        setOwnWishlistIds(new Set(getLocalWishlist(user!.id).map(item => item.product_id)))
        setClosePeople(getLocalPeople(user!.id).filter(p => p.name !== 'خودم'))
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
    if (!isOwnOccasion(occ)) return
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
    const target = occasions.find(o => o.id === occId)
    if (target && !isOwnOccasion(target)) return
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

  const productKey = (item: { id?: string; product_id?: string; product: Product | null }) =>
    item.product_id || item.product?.id || item.id || ''

  const persistShoppingStatus = async (
    item: { id?: string; product_id?: string; product: Product | Product[] | null },
    status: 'reserved' | 'purchased' | 'gifted',
    receiverOverride?: ClosePerson | null,
  ) => {
    if (!user || !person) {
      showToast('ابتدا وارد شوید')
      return
    }
    const { product, productId } = resolveWishlistItem(item)
    if (!productId) {
      showToast('آیتم هدیه نامعتبر است')
      return
    }
    const targetPerson = receiverOverride || person
    const trackOnProfile = !receiverOverride || receiverOverride.id === person.id
    const now = new Date().toISOString()
    const current = trackOnProfile
      ? (shopStatus[productId] || (item.id ? shopStatus[item.id] : undefined))
      : undefined
    setUpdatingProduct(productId)
    if (trackOnProfile) {
      setShopStatus(prev => {
        const next = { ...prev, [productId]: { id: current?.id || productId, status } }
        if (item.id) next[item.id] = { id: current?.id || productId, status }
        if (product?.id) next[product.id] = { id: current?.id || productId, status }
        return next
      })
    }
    try {
      let localItem = current?.id ? updateLocalShoppingItem(current.id, {
        status,
        product: product || undefined,
        purchased_at: status === 'purchased' || status === 'gifted' ? now : current && undefined,
        gifted_at: status === 'gifted' ? now : undefined,
      }) : null
      if (!localItem) {
        localItem = createLocalShoppingItem({
          user_id: user.id,
          receiver_id: targetPerson.id,
          product_id: productId,
          product,
          status,
        })
      }
      if (status === 'gifted') {
        updateLocalShoppingItem(localItem.id, {
          status: 'gifted',
          purchased_at: localItem.purchased_at || now,
          gifted_at: now,
          product: product || localItem.product,
        })
        markGiftGiven({
          giver_user_id: user.id,
          giver_name: profile?.name || 'یک کاربر',
          receiver_person_id: targetPerson.id,
          receiver_user_id: targetPerson.linked_user_id,
          product_id: productId,
          product: product || localItem.product,
          shopping_item_id: localItem.id,
        })
        const receiverUserId = targetPerson.linked_user_id
          || (targetPerson.name === 'خودم' ? targetPerson.owner_user_id : null)
        if (!user.id.startsWith('local-') && receiverUserId) {
          try {
            let query = supabase.from('wishlist_items').delete().eq('owner_user_id', receiverUserId).eq('product_id', productId)
            if (item.id) query = supabase.from('wishlist_items').delete().eq('id', item.id)
            await query
          } catch {
            // local fallback
          }
        }
        setWishlistItems(prev => prev.filter(w => {
          const keys = new Set(wishlistKeys(w))
          return !keys.has(productId) && !(item.id && keys.has(item.id)) && !(product?.id && keys.has(product.id))
        }))
        showToast('هدیه ثبت شد و از لیست خواسته‌ها حذف شد')
      } else if (status === 'reserved') {
        showToast(`برای ${targetPerson.name} رزرو شد`)
      }
      if (trackOnProfile) {
        setShopStatus(prev => {
          const next = { ...prev, [productId]: { id: localItem.id, status } }
          if (item.id) next[item.id] = { id: localItem.id, status }
          if (product?.id) next[product.id] = { id: localItem.id, status }
          return next
        })
      }
      if (!user.id.startsWith('local-')) {
        try {
          if (current?.id && current.id !== productId) {
            await supabase.from('shopping_list_items').update({
              status,
              purchased_at: status === 'purchased' || status === 'gifted' ? now : null,
              gifted_at: status === 'gifted' ? now : null,
              updated_at: now,
            }).eq('id', current.id)
          } else {
            const { data } = await supabase.from('shopping_list_items').insert({
              user_id: user.id,
              receiver_id: targetPerson.id,
              product_id: productId,
              status,
              reserved_at: now,
              purchased_at: status === 'purchased' || status === 'gifted' ? now : null,
              gifted_at: status === 'gifted' ? now : null,
            }).select('id').maybeSingle()
            if (data?.id && trackOnProfile) {
              setShopStatus(prev => ({ ...prev, [productId]: { id: data.id, status } }))
            }
          }
        } catch {
          // local fallback
        }
      }
    } catch {
      showToast('ثبت هدیه انجام نشد')
    } finally {
      setUpdatingProduct(null)
    }
  }

  const handleReserve = (item: { id?: string; product_id?: string; product: Product | null }) => {
    if (!item.product) {
      showToast('آیتم هدیه نامعتبر است')
      return
    }
    openReservePicker(item.product)
  }

  const handleMarkPurchased = (item: { id?: string; product_id?: string; product: Product | null }) => {
    void persistShoppingStatus(item, 'purchased')
  }

  const handleMarkGifted = (item: { id?: string; product_id?: string; product: Product | null }) => {
    void persistShoppingStatus(item, 'gifted')
  }

  const resetAddReceiverForm = () => {
    setShowAddReceiver(false)
    setNewReceiverName('')
    setNewReceiverPhone('')
    setNewReceiverGender('unknown')
    setNewReceiverCloseness('very_close')
    setSendInvite(false)
  }

  const closeReservePicker = () => {
    setReserveTargetProduct(null)
    setSelectedReceiverId('')
    setReserveForOther(false)
    resetAddReceiverForm()
  }

  const receiverChoices = closePeople.filter(p => p.id !== person?.id)

  const openReservePicker = (product: Product) => {
    setReserveTargetProduct(product)
    setSelectedReceiverId('')
    setReserveForOther(false)
    resetAddReceiverForm()
  }

  const confirmReserveForReceiver = async () => {
    if (!reserveTargetProduct) return
    const product = reserveTargetProduct
    if (!reserveForOther) {
      void persistShoppingStatus({ product_id: product.id, product }, 'reserved')
      closeReservePicker()
      setPreviewProduct(null)
      setPreviewSource(null)
      return
    }
    if (showAddReceiver) {
      const created = await addReceiverAndSelect()
      if (!created) return
      void persistShoppingStatus({ product_id: product.id, product }, 'reserved', created)
      closeReservePicker()
      setPreviewProduct(null)
      setPreviewSource(null)
      return
    }
    if (!selectedReceiverId) {
      showToast('یک نزدیک را انتخاب کنید')
      return
    }
    const receiver = closePeople.find(p => p.id === selectedReceiverId)
    if (!receiver) {
      showToast('نزدیک انتخاب‌شده یافت نشد')
      return
    }
    void persistShoppingStatus({ product_id: product.id, product }, 'reserved', receiver)
    closeReservePicker()
    setPreviewProduct(null)
    setPreviewSource(null)
  }

  const addReceiverAndSelect = async (): Promise<ClosePerson | null> => {
    if (!user) return null
    if (!newReceiverName.trim()) {
      showToast('نام را وارد کنید')
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
    setClosePeople(prev => [created!, ...prev.filter(p => p.id !== created!.id)])
    setSelectedReceiverId(created.id)
    setSavingReceiver(false)
    if (shouldInvite) {
      void sendGiftInvite(invitePhone)
    }
    return created
  }

  const addPreviewToWishlist = async (product: Product) => {
    if (!user) {
      showToast('ابتدا وارد شوید')
      return
    }
    if (ownWishlistIds.has(product.id)) {
      showToast('قبلاً به لیست خواسته‌ها اضافه شده')
      return
    }
    setWishlistSaving(true)
    addLocalWishlistItem(user.id, product.id)
    setOwnWishlistIds(prev => new Set(prev).add(product.id))
    if (!user.id.startsWith('local-')) {
      try {
        await supabase.from('wishlist_items').insert({ owner_user_id: user.id, product_id: product.id })
      } catch {
        // local fallback
      }
    }
    showToast('به لیست خواسته‌ها افزوده شد')
    setWishlistSaving(false)
  }

  const previewShopStatus = previewProduct
    ? shopStatus[previewProduct.id]
    : undefined

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
  const visitorView = !isSelf
  const visibleOccasions = visitorView && !showAllOccasions ? occasions.slice(-3) : occasions
  const visibleGreetings = visitorView && !showAllGreetings ? approvedGreetings.slice(-3) : approvedGreetings
  const visibleWishlist = visitorView && !showAllWishlist ? wishlistItems.slice(-4) : wishlistItems
  const visibleReceived = visitorView && !showAllReceived ? receivedGifts.slice(-4) : receivedGifts

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
              {!isSelf && (
                <p className="text-sm text-white/80">{closenessLabel(person.closeness)}{person.phone ? ` • ${person.phone}` : ''}</p>
              )}
              {displayBirthDate && (
                <p className="text-sm text-white/80">متولد {formatMonthDay(displayBirthDate)}</p>
              )}
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
            <div className="flex items-center gap-3">
              {visitorView && occasions.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllOccasions(v => !v)}
                  className="text-sm text-primary-600 font-medium"
                >
                  {showAllOccasions ? 'کمتر' : 'همه'}
                </button>
              )}
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
              {visibleOccasions.map(occ => {
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
                const canEdit = isOwnOccasion(occ)
                return (
                  <div key={occ.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    inWindow ? 'bg-primary-50 border-primary-200' : 'bg-white border-stone-100'
                  }`}>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{occ.title}</p>
                      <p className="text-xs text-stone-500">
                        {formatMonthDay(occ.occasion_date)}
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
        </section>

        {approvedGreetings.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <PartyPopper size={18} className="text-error-500" />
                پیام‌های تبریک
              </h3>
              {visitorView && approvedGreetings.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllGreetings(v => !v)}
                  className="text-sm text-primary-600 font-medium"
                >
                  {showAllGreetings ? 'کمتر' : 'همه'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {visibleGreetings.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-white border border-stone-100">
                  <p className="text-sm font-medium text-stone-800">{item.sender_name}</p>
                  {item.occasion_title && <p className="text-xs text-stone-400 mt-0.5">{item.occasion_title}</p>}
                  <p className="text-sm text-stone-600 mt-1.5 leading-6">{item.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {person.linked_user_id && wishlistItems.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Heart size={18} className="text-primary-500" />
                لیست خواسته‌ها
              </h3>
              {visitorView && wishlistItems.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllWishlist(v => !v)}
                  className="text-sm text-primary-600 font-medium"
                >
                  {showAllWishlist ? 'کمتر' : 'همه'}
                </button>
              )}
            </div>
            {visitorView && !showAllWishlist ? (
              <div className="grid grid-cols-4 gap-2">
                {visibleWishlist.map((item, idx) => {
                  const pid = productKey(item)
                  return (
                    <button
                      key={pid || idx}
                      type="button"
                    onClick={() => {
                      if (!item.product) return
                      setPreviewSource('received')
                      setPreviewProduct(item.product)
                    }}
                      className="aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-100"
                    >
                      {item.product?.image_url ? (
                        <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart size={16} className="text-stone-300" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {wishlistItems.map((item, idx) => {
                  const pid = productKey(item)
                  const current = pid ? shopStatus[pid] : undefined
                  const busy = updatingProduct === pid
                  return (
                    <div key={pid || idx} className="rounded-xl bg-white border border-stone-100 overflow-hidden">
                      <button
                        type="button"
                      onClick={() => {
                        if (!item.product) return
                        setPreviewSource('wishlist')
                        setPreviewProduct(item.product)
                      }}
                        className="w-full flex items-center gap-3 p-3 text-right"
                      >
                        {item.product?.image_url && (
                          <img src={item.product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{item.product?.title}</p>
                          <p className="text-xs text-stone-500">
                            {item.product ? formatPrice(item.product.price_amount) : ''}
                          </p>
                        </div>
                        {busy && <Loader2 size={16} className="animate-spin text-stone-400 shrink-0" />}
                      </button>
                      {!isSelf && (
                        <div className="flex border-t border-stone-100">
                          {item.product?.shop_url && (
                            <a
                              href={item.product.shop_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-1"
                            >
                              <ShoppingBag size={14} /> خرید
                            </a>
                          )}
                          {current?.status === 'gifted' ? (
                            <div className="flex-1 py-2 text-xs font-medium text-success-600 flex items-center justify-center gap-1 border-r border-stone-100">
                              <Gift size={14} /> هدیه داده شد
                            </div>
                          ) : current?.status === 'purchased' ? (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkGifted(item) }}
                              disabled={busy}
                              className="flex-1 py-2 text-xs font-medium text-success-600 hover:bg-success-50 transition-colors flex items-center justify-center gap-1 border-r border-stone-100 disabled:opacity-50"
                            >
                              <Gift size={14} /> هدیه دادم
                            </button>
                          ) : current?.status === 'reserved' ? (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkPurchased(item) }}
                              disabled={busy}
                              className="flex-1 py-2 text-xs font-medium text-secondary-600 hover:bg-secondary-50 transition-colors flex items-center justify-center gap-1 border-r border-stone-100 disabled:opacity-50"
                            >
                              <Check size={14} /> خریدم
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReserve(item) }}
                                disabled={busy}
                                className="flex-1 py-2 text-xs font-medium text-error-600 hover:bg-error-50 transition-colors flex items-center justify-center gap-1 border-r border-stone-100 disabled:opacity-50"
                              >
                                رزرو
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkPurchased(item) }}
                                disabled={busy}
                                className="flex-1 py-2 text-xs font-medium text-secondary-600 hover:bg-secondary-50 transition-colors flex items-center justify-center gap-1 border-r border-stone-100 disabled:opacity-50"
                              >
                                <Check size={14} /> خریدم
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {person.linked_user_id && receivedGifts.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <Gift size={18} className="text-success-500" />
                هدیه‌های دریافتی
              </h3>
              {visitorView && receivedGifts.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllReceived(v => !v)}
                  className="text-sm text-primary-600 font-medium"
                >
                  {showAllReceived ? 'کمتر' : 'همه'}
                </button>
              )}
            </div>
            {visitorView ? (
              <div className="grid grid-cols-4 gap-2">
                {visibleReceived.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.product && setPreviewProduct(item.product)}
                    className="aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-100"
                  >
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift size={16} className="text-stone-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {receivedGifts.map(item => (
                  <div key={item.id} className="rounded-xl bg-white border border-stone-100 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      {item.product?.image_url && (
                        <img src={item.product.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{item.product?.title}</p>
                        <p className="text-xs text-stone-500">از طرف {item.giver_name}</p>
                      </div>
                      {item.confirmed && (
                        <span className="text-[11px] font-medium text-success-600 shrink-0">تأیید شده</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-50 px-5 flex justify-center pointer-events-none">
          <div className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium shadow-lg">
            {toastMsg}
          </div>
        </div>
      )}

      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setPreviewProduct(null)}>
          <div
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {previewProduct.image_url ? (
                <img src={previewProduct.image_url} alt="" className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-stone-100 flex items-center justify-center">
                  <Gift size={40} className="text-stone-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="absolute top-3 left-3 w-9 h-9 rounded-full bg-neutral-900/80 text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-stone-500">{previewProduct.merchant_name}</p>
              <h3 className="font-bold text-stone-800 mt-1">{previewProduct.title}</h3>
              <p className="text-primary-600 font-bold mt-2">{formatPrice(previewProduct.price_amount)}</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {previewProduct.shop_url && (
                  <a
                    href={previewProduct.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 rounded-xl bg-primary-500 text-white text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <ShoppingBag size={14} /> خرید
                  </a>
                )}
                {previewShopStatus?.status === 'gifted' ? (
                  <div className="py-2.5 rounded-xl bg-success-50 text-success-600 text-xs font-medium flex items-center justify-center gap-1">
                    <Gift size={14} /> هدیه داده شد
                  </div>
                ) : previewShopStatus?.status === 'purchased' ? (
                  <button
                    type="button"
                    onClick={() => {
                      void persistShoppingStatus({ product_id: previewProduct.id, product: previewProduct }, 'gifted')
                      setPreviewProduct(null)
                    }}
                    disabled={updatingProduct === previewProduct.id}
                    className="py-2.5 rounded-xl bg-success-50 text-success-600 text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Gift size={14} /> هدیه دادم
                  </button>
                ) : previewShopStatus?.status === 'reserved' ? (
                  <button
                    type="button"
                    onClick={() => {
                      void persistShoppingStatus({ product_id: previewProduct.id, product: previewProduct }, 'purchased')
                      setPreviewProduct(null)
                    }}
                    disabled={updatingProduct === previewProduct.id}
                    className="py-2.5 rounded-xl bg-secondary-50 text-secondary-600 text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Check size={14} /> خریدم
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      openReservePicker(previewProduct)
                      setPreviewProduct(null)
                      setPreviewSource(null)
                    }}
                    disabled={updatingProduct === previewProduct.id}
                    className="py-2.5 rounded-xl bg-error-50 text-error-600 text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    رزرو
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { void addPreviewToWishlist(previewProduct) }}
                  disabled={wishlistSaving || ownWishlistIds.has(previewProduct.id)}
                  className="py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50 col-span-2"
                >
                  {ownWishlistIds.has(previewProduct.id) ? <Check size={14} /> : <Plus size={14} />}
                  افزودن به لیست خواسته‌ها
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reserveTargetProduct && (
        <div className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-[60] flex items-end justify-center" onClick={closeReservePicker}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative bg-white w-full rounded-t-3xl p-5 pb-24 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">رزرو هدیه</h2>
              <button type="button" onClick={closeReservePicker} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={20} className="text-stone-500" />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              این آیتم را برای {person.name} می‌خواهید یا برای شخص دیگر؟
            </p>
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setReserveForOther(false)
                  setShowAddReceiver(false)
                  setSelectedReceiverId('')
                }}
                className={`w-full p-3.5 rounded-2xl border text-right transition-all ${
                  !reserveForOther ? 'bg-primary-50 border-primary-300' : 'bg-white border-stone-100'
                }`}
              >
                <p className="font-semibold text-stone-800">برای {person.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">همین کاربر</p>
              </button>
              <button
                type="button"
                onClick={() => setReserveForOther(true)}
                className={`w-full p-3.5 rounded-2xl border text-right transition-all ${
                  reserveForOther ? 'bg-primary-50 border-primary-300' : 'bg-white border-stone-100'
                }`}
              >
                <p className="font-semibold text-stone-800">برای شخص دیگر</p>
                <p className="text-xs text-stone-500 mt-0.5">از لیست نزدیکان انتخاب کنید</p>
              </button>
            </div>
            {reserveForOther && (
              <div className="mb-4 space-y-3">
                <label className="text-sm text-stone-600 mb-1 block">انتخاب نزدیک</label>
                <select
                  value={selectedReceiverId}
                  onChange={(e) => setSelectedReceiverId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white"
                >
                  <option value="">یک نفر را انتخاب کنید</option>
                  {receiverChoices.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.name === 'خودم' ? '' : ` (${closenessLabel(p.closeness)})`}
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
            )}
            <button
              type="button"
              onClick={() => { void confirmReserveForReceiver() }}
              disabled={updatingProduct === reserveTargetProduct.id || savingReceiver}
              className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all"
            >
              تأیید رزرو
            </button>
          </div>
        </div>
      )}

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
