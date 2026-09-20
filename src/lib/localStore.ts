import { ClosePerson, Occasion, Profile, Product, ShoppingListItem, WishlistItem, MyOccasion, MyOccasionVisibility, Greeting, GreetingStatus, Notification, ReceivedGift, sameMonthDay } from './types'
import { getCatalogProduct } from './catalog'

const PEOPLE_KEY = 'kadoba_local_people'
const OCCASIONS_KEY = 'kadoba_local_occasions'
const PROFILE_KEY = 'kadoba_local_profile'
const SHOPPING_KEY = 'kadoba_local_shopping'
const WISHLIST_KEY = 'kadoba_local_wishlist'
const MY_OCCASIONS_KEY = 'kadoba_local_my_occasions'
const GREETINGS_KEY = 'kadoba_local_greetings'
const NOTIFICATIONS_KEY = 'kadoba_local_notifications'
const RECEIVED_GIFTS_KEY = 'kadoba_local_received_gifts'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getLocalPeople(ownerUserId: string): ClosePerson[] {
  return readJson<ClosePerson[]>(PEOPLE_KEY, []).filter(p => p.owner_user_id === ownerUserId)
}

export function saveLocalPeople(people: ClosePerson[]) {
  writeJson(PEOPLE_KEY, people)
}

export function getAllLocalPeople(): ClosePerson[] {
  return readJson<ClosePerson[]>(PEOPLE_KEY, [])
}

export function upsertLocalPerson(person: ClosePerson): ClosePerson {
  const all = getAllLocalPeople()
  const index = all.findIndex(p => p.id === person.id)
  if (index >= 0) all[index] = person
  else all.unshift(person)
  saveLocalPeople(all)
  return person
}

export function deleteLocalPerson(id: string) {
  saveLocalPeople(getAllLocalPeople().filter(p => p.id !== id))
  writeJson(OCCASIONS_KEY, getAllLocalOccasions().filter(o => o.person_id !== id))
}

export function getAllLocalOccasions(): Occasion[] {
  return readJson<Occasion[]>(OCCASIONS_KEY, [])
}

export function getLocalOccasions(personId: string): Occasion[] {
  return getAllLocalOccasions()
    .filter(o => o.person_id === personId)
    .sort((a, b) => a.occasion_date.localeCompare(b.occasion_date))
}

export function upsertLocalOccasion(occasion: Occasion): Occasion {
  const all = getAllLocalOccasions()
  const index = all.findIndex(o => o.id === occasion.id)
  if (index >= 0) all[index] = occasion
  else all.push(occasion)
  writeJson(OCCASIONS_KEY, all)
  return occasion
}

export function deleteLocalOccasion(id: string) {
  writeJson(OCCASIONS_KEY, getAllLocalOccasions().filter(o => o.id !== id))
}

export function createLocalPerson(input: Omit<ClosePerson, 'id' | 'created_at' | 'updated_at'>): ClosePerson {
  const now = new Date().toISOString()
  return upsertLocalPerson({
    ...input,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  })
}

export function createLocalOccasion(input: Omit<Occasion, 'id' | 'created_at' | 'updated_at' | 'repeats_yearly'> & { repeats_yearly?: boolean }): Occasion {
  const now = new Date().toISOString()
  return upsertLocalOccasion({
    ...input,
    repeats_yearly: input.repeats_yearly ?? input.source === 'birthday',
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  })
}

export function getLocalProfile(userId: string): Profile | null {
  const all = readJson<Record<string, Profile>>(PROFILE_KEY, {})
  return all[userId] || null
}

export function findLocalProfileByPhone(phone: string): Profile | null {
  const normalized = phone.replace(/\D/g, '')
  if (!normalized) return null
  const all = readJson<Record<string, Profile>>(PROFILE_KEY, {})
  return Object.values(all).find(p => (p.phone_number || '').replace(/\D/g, '') === normalized) || null
}

export function saveLocalProfile(profile: Profile): Profile {
  const all = readJson<Record<string, Profile>>(PROFILE_KEY, {})
  const next = {
    ...profile,
    updated_at: new Date().toISOString(),
    created_at: profile.created_at || new Date().toISOString(),
  }
  all[profile.id] = next
  writeJson(PROFILE_KEY, all)
  return next
}

export function getUpcomingLocalOccasions(ownerUserId: string, limit = 3) {
  const people = getLocalPeople(ownerUserId)
  const names = new Map(people.map(p => [p.id, p.name]))
  return people
    .flatMap(p => getDisplayOccasionsForPerson(p))
    .filter(o => names.has(o.person_id))
    .map(o => ({ ...o, person_name: names.get(o.person_id) }))
}

function getAllLocalShopping(): ShoppingListItem[] {
  return readJson<ShoppingListItem[]>(SHOPPING_KEY, [])
}

export function getLocalShoppingItems(userId: string): ShoppingListItem[] {
  const people = getAllLocalPeople()
  return getAllLocalShopping()
    .filter(item => item.user_id === userId)
    .map(item => ({
      ...item,
      product: item.product || getCatalogProduct(item.product_id) || null,
      receiver: item.receiver || people.find(p => p.id === item.receiver_id) || null,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function updateLocalShoppingItem(id: string, updates: Partial<ShoppingListItem>): ShoppingListItem | null {
  const all = getAllLocalShopping()
  const index = all.findIndex(item => item.id === id)
  if (index < 0) return null
  const next = { ...all[index], ...updates, id: all[index].id, updated_at: new Date().toISOString() }
  all[index] = next
  writeJson(SHOPPING_KEY, all)
  return next
}

export function deleteLocalShoppingItem(id: string) {
  writeJson(SHOPPING_KEY, getAllLocalShopping().filter(item => item.id !== id))
}

export function createLocalShoppingItem(input: {
  user_id: string
  receiver_id: string
  product_id: string
  session_id?: string | null
  product?: Product | null
  status?: string
}): ShoppingListItem {
  const now = new Date().toISOString()
  const existing = getAllLocalShopping().find(item => (
    item.user_id === input.user_id
    && item.receiver_id === input.receiver_id
    && item.product_id === input.product_id
    && item.status !== 'gifted'
  ))
  if (existing) {
    const nextStatus = input.status || existing.status
    return updateLocalShoppingItem(existing.id, {
      product: input.product || existing.product || getCatalogProduct(input.product_id) || null,
      status: nextStatus,
      purchased_at: nextStatus === 'purchased' || nextStatus === 'gifted' ? existing.purchased_at || now : existing.purchased_at,
      gifted_at: nextStatus === 'gifted' ? existing.gifted_at || now : existing.gifted_at,
    }) || existing
  }
  const product = input.product || getCatalogProduct(input.product_id) || null
  const receiver = getAllLocalPeople().find(p => p.id === input.receiver_id) || null
  const status = input.status || 'reserved'
  const item: ShoppingListItem = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    receiver_id: input.receiver_id,
    product_id: input.product_id,
    product,
    receiver,
    status,
    session_id: input.session_id || null,
    reserved_at: now,
    purchased_at: status === 'purchased' || status === 'gifted' ? now : null,
    gifted_at: status === 'gifted' ? now : null,
    created_at: now,
    updated_at: now,
  }
  writeJson(SHOPPING_KEY, [item, ...getAllLocalShopping()])
  return item
}

function getAllLocalWishlist(): WishlistItem[] {
  return readJson<WishlistItem[]>(WISHLIST_KEY, [])
}

export function removeLocalWishlistItemByProduct(ownerUserId: string, productId: string) {
  writeJson(
    WISHLIST_KEY,
    getAllLocalWishlist().filter(item => !(item.owner_user_id === ownerUserId && item.product_id === productId)),
  )
}

function getAllLocalNotifications(): Notification[] {
  return readJson<Notification[]>(NOTIFICATIONS_KEY, [])
}

export function getLocalNotifications(userId: string): Notification[] {
  return getAllLocalNotifications()
    .filter(item => item.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function addLocalNotification(input: {
  user_id: string
  type: string
  payload_json?: Record<string, unknown>
}): Notification {
  const now = new Date().toISOString()
  const item: Notification = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: input.type,
    payload_json: input.payload_json || {},
    scheduled_at: now,
    sent_at: now,
    status: 'unread',
    created_at: now,
  }
  writeJson(NOTIFICATIONS_KEY, [item, ...getAllLocalNotifications()])
  return item
}

export function updateLocalNotification(id: string, updates: Partial<Notification>): Notification | null {
  const all = getAllLocalNotifications()
  const index = all.findIndex(item => item.id === id)
  if (index < 0) return null
  const next = { ...all[index], ...updates, id: all[index].id }
  all[index] = next
  writeJson(NOTIFICATIONS_KEY, all)
  return next
}

function getAllLocalReceivedGifts(): ReceivedGift[] {
  return readJson<ReceivedGift[]>(RECEIVED_GIFTS_KEY, [])
}

export function getLocalReceivedGifts(userId: string): ReceivedGift[] {
  return getAllLocalReceivedGifts()
    .filter(item => item.receiver_user_id === userId)
    .map(item => ({ ...item, product: item.product || getCatalogProduct(item.product_id) || null }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function addLocalReceivedGift(input: {
  receiver_user_id: string
  giver_user_id: string
  giver_name: string
  product_id: string
  product?: Product | null
  shopping_item_id?: string | null
}): ReceivedGift {
  const existing = getAllLocalReceivedGifts().find(item => (
    item.receiver_user_id === input.receiver_user_id
    && item.product_id === input.product_id
  ))
  if (existing) {
    return {
      ...existing,
      product: existing.product || input.product || getCatalogProduct(existing.product_id) || null,
    }
  }
  const item: ReceivedGift = {
    id: crypto.randomUUID(),
    receiver_user_id: input.receiver_user_id,
    giver_user_id: input.giver_user_id,
    giver_name: input.giver_name,
    product_id: input.product_id,
    product: input.product || getCatalogProduct(input.product_id) || null,
    shopping_item_id: input.shopping_item_id || null,
    confirmed: false,
    created_at: new Date().toISOString(),
  }
  writeJson(RECEIVED_GIFTS_KEY, [item, ...getAllLocalReceivedGifts()])
  return item
}

export function confirmLocalReceivedGift(id: string): ReceivedGift | null {
  const all = getAllLocalReceivedGifts()
  const index = all.findIndex(item => item.id === id)
  if (index < 0) return null
  const next = { ...all[index], confirmed: true }
  all[index] = next
  writeJson(RECEIVED_GIFTS_KEY, all)
  return next
}

export function markGiftGiven(input: {
  giver_user_id: string
  giver_name: string
  receiver_person_id: string
  receiver_user_id?: string | null
  product_id: string
  product?: Product | null
  shopping_item_id?: string | null
}): Notification | null {
  const people = getAllLocalPeople()
  const receiverPerson = people.find(p => p.id === input.receiver_person_id) || null
  const receiverUserId = input.receiver_user_id
    || receiverPerson?.linked_user_id
    || (receiverPerson?.name === 'خودم' ? receiverPerson.owner_user_id : null)
  if (!receiverUserId) return null
  removeLocalWishlistItemByProduct(receiverUserId, input.product_id)
  const received = addLocalReceivedGift({
    receiver_user_id: receiverUserId,
    giver_user_id: input.giver_user_id,
    giver_name: input.giver_name,
    product_id: input.product_id,
    product: input.product,
    shopping_item_id: input.shopping_item_id,
  })
  const productTitle = received.product?.title || input.product?.title || 'یک آیتم'
  return addLocalNotification({
    user_id: receiverUserId,
    type: 'gift_received',
    payload_json: {
      giver_name: input.giver_name,
      product_title: productTitle,
      product_id: input.product_id,
      received_gift_id: received.id,
    },
  })
}

export function getLocalWishlist(userId: string): WishlistItem[] {
  return getAllLocalWishlist()
    .filter(item => item.owner_user_id === userId)
    .map(item => ({ ...item, product: item.product || getCatalogProduct(item.product_id) || null }))
}

export function getAllLocalMyOccasions(): MyOccasion[] {
  return readJson<MyOccasion[]>(MY_OCCASIONS_KEY, [])
}

export function getLocalMyOccasions(userId: string): MyOccasion[] {
  return getAllLocalMyOccasions()
    .filter(o => o.owner_user_id === userId)
    .sort((a, b) => a.occasion_date.localeCompare(b.occasion_date))
}

export function getVisibleLocalMyOccasions(ownerUserId: string, closeness: string): MyOccasion[] {
  return getLocalMyOccasions(ownerUserId).filter(o => (
    o.visibility === 'public' || closeness === 'very_close'
  ))
}

export function mergePersonOccasionsWithShared(
  personId: string,
  ownOccasions: Occasion[],
  shared: MyOccasion[],
): Occasion[] {
  const merged = [...ownOccasions]
  for (const item of shared) {
    const duplicate = merged.some(o =>
      o.title === item.title && sameMonthDay(o.occasion_date, item.occasion_date)
    )
    if (duplicate) continue
    merged.push({
      id: `shared-${item.id}`,
      person_id: personId,
      title: item.title,
      occasion_date: item.occasion_date,
      repeats_yearly: item.repeats_yearly,
      source: item.title === 'تولد' ? 'birthday' : 'shared',
      shared: true,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })
  }
  return merged.sort((a, b) => a.occasion_date.localeCompare(b.occasion_date))
}

export function getDisplayOccasionsForPerson(
  person: ClosePerson,
  options?: { own?: Occasion[]; shared?: MyOccasion[]; linkedBirthDate?: string | null },
): Occasion[] {
  const own = options?.own ?? getLocalOccasions(person.id)
  if (!person.linked_user_id) return own
  const linked = getLocalProfile(person.linked_user_id)
  const birth = options?.linkedBirthDate ?? linked?.birth_date ?? null
  const extras = [...(options?.shared ?? getVisibleLocalMyOccasions(person.linked_user_id, person.closeness))]
    .filter(o => o.visibility === 'public' || person.closeness === 'very_close')
  if (birth && !extras.some(o => o.title === 'تولد')) {
    extras.unshift({
      id: `linked-bday-${person.linked_user_id}`,
      owner_user_id: person.linked_user_id,
      title: 'تولد',
      occasion_date: birth,
      repeats_yearly: true,
      visibility: 'public',
      created_at: linked?.created_at || person.created_at,
      updated_at: linked?.updated_at || person.updated_at,
    })
  }
  const ownFiltered = birth
    ? own.filter(o => o.source !== 'birthday' && o.title !== 'تولد')
    : own
  return mergePersonOccasionsWithShared(person.id, ownFiltered, extras)
}

export function getAllDisplayOccasionsForOwner(ownerUserId: string): Occasion[] {
  return getLocalPeople(ownerUserId).flatMap(p => getDisplayOccasionsForPerson(p))
}

export function applyLinkedAccountToPerson(person: ClosePerson): { person: ClosePerson; occasions: Occasion[] } {
  if (!person.linked_user_id) {
    return { person, occasions: getLocalOccasions(person.id) }
  }
  const linked = getLocalProfile(person.linked_user_id)
  let next = person
  if (linked?.birth_date && person.birth_date !== linked.birth_date) {
    next = { ...person, birth_date: linked.birth_date, updated_at: new Date().toISOString() }
    upsertLocalPerson(next)
  }
  return { person: next, occasions: getDisplayOccasionsForPerson(next) }
}

export function isOwnOccasion(occ: Occasion): boolean {
  return !occ.shared && occ.source !== 'shared'
}

export function createLocalMyOccasion(input: {
  owner_user_id: string
  title: string
  occasion_date: string
  repeats_yearly: boolean
  visibility: MyOccasionVisibility
}): MyOccasion {
  const now = new Date().toISOString()
  const item: MyOccasion = {
    id: crypto.randomUUID(),
    owner_user_id: input.owner_user_id,
    title: input.title,
    occasion_date: input.occasion_date,
    repeats_yearly: input.repeats_yearly,
    visibility: input.visibility,
    created_at: now,
    updated_at: now,
  }
  writeJson(MY_OCCASIONS_KEY, [...getAllLocalMyOccasions(), item])
  return item
}

export function upsertLocalMyOccasion(item: MyOccasion): MyOccasion {
  const all = getAllLocalMyOccasions()
  const index = all.findIndex(o => o.id === item.id)
  if (index >= 0) all[index] = item
  else all.push(item)
  writeJson(MY_OCCASIONS_KEY, all)
  return item
}

export function deleteLocalMyOccasion(id: string) {
  writeJson(MY_OCCASIONS_KEY, getAllLocalMyOccasions().filter(o => o.id !== id))
}

function getAllLocalGreetings(): Greeting[] {
  return readJson<Greeting[]>(GREETINGS_KEY, [])
}

export function getLocalGreetingsForReceiver(receiverUserId: string, statuses?: GreetingStatus[]): Greeting[] {
  return getAllLocalGreetings()
    .filter(g => g.receiver_user_id === receiverUserId && (!statuses || statuses.includes(g.status)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getLocalGreetingsForPerson(personId: string, statuses?: GreetingStatus[]): Greeting[] {
  return getAllLocalGreetings()
    .filter(g => g.receiver_person_id === personId && (!statuses || statuses.includes(g.status)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function createLocalGreeting(input: Omit<Greeting, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: GreetingStatus }): Greeting {
  const now = new Date().toISOString()
  const item: Greeting = {
    ...input,
    id: crypto.randomUUID(),
    status: input.status || 'pending',
    created_at: now,
    updated_at: now,
  }
  writeJson(GREETINGS_KEY, [item, ...getAllLocalGreetings()])
  return item
}

export function updateLocalGreetingStatus(id: string, status: GreetingStatus): Greeting | null {
  const all = getAllLocalGreetings()
  const index = all.findIndex(g => g.id === id)
  if (index < 0) return null
  const next = { ...all[index], status, updated_at: new Date().toISOString() }
  all[index] = next
  writeJson(GREETINGS_KEY, all)
  return next
}

export function addLocalWishlistItem(userId: string, productId: string, visibility = 'public'): WishlistItem | null {
  const existing = getAllLocalWishlist()
  if (existing.some(item => item.owner_user_id === userId && item.product_id === productId)) return null
  const item: WishlistItem = {
    id: crypto.randomUUID(),
    owner_user_id: userId,
    product_id: productId,
    product: getCatalogProduct(productId) || null,
    visibility,
    created_at: new Date().toISOString(),
  }
  writeJson(WISHLIST_KEY, [item, ...existing])
  return item
}

export const DEMO_USER_ID = 'local-09120000000'
export const DEMO_PERSON_ID = 'demo-person-ali-rezaei'
export const DEMO_PHONE = '09120000000'

const DEMO_AVATAR = 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg'

function upsertLocalShoppingItem(item: ShoppingListItem) {
  const all = getAllLocalShopping()
  const index = all.findIndex(i => i.id === item.id)
  if (index >= 0) all[index] = item
  else all.unshift(item)
  writeJson(SHOPPING_KEY, all)
}

function seedDemoWishlist() {
  const existing = getAllLocalWishlist()
  const specs: { id: string; productId: string; visibility: string }[] = [
    { id: 'demo-wish-1', productId: 'p005', visibility: 'public' },
    { id: 'demo-wish-2', productId: 'p009', visibility: 'public' },
    { id: 'demo-wish-3', productId: 'p027', visibility: 'private' },
    { id: 'demo-wish-4', productId: 'p012', visibility: 'public' },
    { id: 'demo-wish-5', productId: 'p002', visibility: 'public' },
    { id: 'demo-wish-6', productId: 'p019', visibility: 'public' },
    { id: 'demo-wish-7', productId: 'p021', visibility: 'public' },
    { id: 'demo-wish-8', productId: 'p025', visibility: 'public' },
    { id: 'demo-wish-9', productId: 'p037', visibility: 'public' },
    { id: 'demo-wish-10', productId: 'p016', visibility: 'public' },
    { id: 'demo-wish-11', productId: 'p022', visibility: 'public' },
    { id: 'demo-wish-12', productId: 'p024', visibility: 'public' },
    { id: 'demo-wish-13', productId: 'p033', visibility: 'public' },
    { id: 'demo-wish-14', productId: 'p015', visibility: 'public' },
  ]
  let changed = false
  const next = [...existing]
  for (const spec of specs) {
    if (next.some(item => item.id === spec.id || (item.owner_user_id === DEMO_USER_ID && item.product_id === spec.productId))) continue
    next.unshift({
      id: spec.id,
      owner_user_id: DEMO_USER_ID,
      product_id: spec.productId,
      product: getCatalogProduct(spec.productId) || null,
      visibility: spec.visibility,
      created_at: new Date().toISOString(),
    })
    changed = true
  }
  if (changed) writeJson(WISHLIST_KEY, next)
}

function seedDemoMyOccasions() {
  const existing = getAllLocalMyOccasions()
  const year = new Date().getFullYear()
  const specs: MyOccasion[] = [
    {
      id: 'demo-myocc-birthday',
      owner_user_id: DEMO_USER_ID,
      title: 'تولد',
      occasion_date: `${year}-03-21`,
      repeats_yearly: true,
      visibility: 'public',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'demo-myocc-job',
      owner_user_id: DEMO_USER_ID,
      title: 'سالگرد شروع کار',
      occasion_date: `${year}-06-12`,
      repeats_yearly: true,
      visibility: 'very_close',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]
  let changed = false
  const next = [...existing]
  for (const spec of specs) {
    if (next.some(item => item.id === spec.id)) continue
    next.push(spec)
    changed = true
  }
  if (changed) writeJson(MY_OCCASIONS_KEY, next)
}

function seedDemoGreetings() {
  const existing = getAllLocalGreetings()
  if (existing.some(g => g.id === 'demo-greeting-approved')) return
  const now = new Date().toISOString()
  writeJson(GREETINGS_KEY, [{
    id: 'demo-greeting-approved',
    sender_user_id: 'local-09121111111',
    sender_name: 'سارا محمدی',
    receiver_person_id: DEMO_PERSON_ID,
    receiver_user_id: DEMO_USER_ID,
    occasion_id: 'demo-occ-birthday',
    occasion_title: 'تولد',
    message: 'علی جان تولدت مبارک! سال خوبی داشته باشی.',
    status: 'approved' as GreetingStatus,
    created_at: now,
    updated_at: now,
  }, ...existing])
}

function seedDemoReceivedGifts() {
  const existing = getAllLocalReceivedGifts()
  const specs: { id: string; productId: string; giverName: string; giverUserId: string; confirmed: boolean }[] = [
    { id: 'demo-recv-1', productId: 'p011', giverName: 'سارا محمدی', giverUserId: 'local-09121111111', confirmed: true },
    { id: 'demo-recv-2', productId: 'p006', giverName: 'رضا کریمی', giverUserId: 'local-09123333333', confirmed: false },
    { id: 'demo-recv-3', productId: 'p022', giverName: 'مینا احمدی', giverUserId: 'local-09124444444', confirmed: true },
  ]
  let changed = false
  const next = [...existing]
  for (const spec of specs) {
    if (next.some(item => item.id === spec.id || (item.receiver_user_id === DEMO_USER_ID && item.product_id === spec.productId))) continue
    next.unshift({
      id: spec.id,
      receiver_user_id: DEMO_USER_ID,
      giver_user_id: spec.giverUserId,
      giver_name: spec.giverName,
      product_id: spec.productId,
      product: getCatalogProduct(spec.productId) || null,
      shopping_item_id: null,
      confirmed: spec.confirmed,
      created_at: new Date().toISOString(),
    })
    changed = true
  }
  if (changed) writeJson(RECEIVED_GIFTS_KEY, next)
}

function seedDemoShopping() {
  const now = new Date().toISOString()
  const product = getCatalogProduct('p002') || null
  upsertLocalShoppingItem({
    id: 'demo-shop-1',
    user_id: DEMO_USER_ID,
    receiver_id: DEMO_PERSON_ID,
    product_id: 'p002',
    product,
    receiver: null,
    status: 'reserved',
    session_id: null,
    reserved_at: now,
    purchased_at: null,
    gifted_at: null,
    created_at: now,
    updated_at: now,
  })
  const purchased = getCatalogProduct('p024') || null
  upsertLocalShoppingItem({
    id: 'demo-shop-2',
    user_id: DEMO_USER_ID,
    receiver_id: DEMO_PERSON_ID,
    product_id: 'p024',
    product: purchased,
    receiver: null,
    status: 'purchased',
    session_id: null,
    reserved_at: now,
    purchased_at: now,
    gifted_at: null,
    created_at: now,
    updated_at: now,
  })
}

export function seedDemoUser() {
  const now = new Date().toISOString()
  saveLocalProfile({
    id: DEMO_USER_ID,
    phone_number: DEMO_PHONE,
    name: 'علی رضایی',
    avatar_url: DEMO_AVATAR,
    birth_date: `${new Date().getFullYear()}-03-21`,
    created_at: now,
    updated_at: now,
  })
  seedDemoWishlist()
  seedDemoMyOccasions()
  seedDemoGreetings()
  seedDemoShopping()
  seedDemoReceivedGifts()
}

export function ensureDemoClosePerson(ownerUserId: string) {
  seedDemoUser()
  if (!ownerUserId || ownerUserId === DEMO_USER_ID) return
  const now = new Date().toISOString()
  const birthDate = `${new Date().getFullYear()}-03-21`
  upsertLocalPerson({
    id: DEMO_PERSON_ID,
    owner_user_id: ownerUserId,
    linked_user_id: DEMO_USER_ID,
    name: 'علی رضایی',
    phone: DEMO_PHONE,
    avatar_url: DEMO_AVATAR,
    birth_date: birthDate,
    gender: 'male',
    closeness: 'very_close',
    created_at: now,
    updated_at: now,
  })
}
