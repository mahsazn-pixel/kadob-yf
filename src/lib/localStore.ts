import { ClosePerson, Occasion, Profile, Product, ShoppingListItem, WishlistItem, MyOccasion, MyOccasionVisibility, Greeting, GreetingStatus } from './types'
import { getCatalogProduct } from './catalog'

const PEOPLE_KEY = 'kadoba_local_people'
const OCCASIONS_KEY = 'kadoba_local_occasions'
const PROFILE_KEY = 'kadoba_local_profile'
const SHOPPING_KEY = 'kadoba_local_shopping'
const WISHLIST_KEY = 'kadoba_local_wishlist'
const MY_OCCASIONS_KEY = 'kadoba_local_my_occasions'
const GREETINGS_KEY = 'kadoba_local_greetings'

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
  return getAllLocalOccasions()
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
}): ShoppingListItem {
  const now = new Date().toISOString()
  const product = getCatalogProduct(input.product_id) || null
  const receiver = getAllLocalPeople().find(p => p.id === input.receiver_id) || null
  const item: ShoppingListItem = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    receiver_id: input.receiver_id,
    product_id: input.product_id,
    product,
    receiver,
    status: 'reserved',
    session_id: input.session_id || null,
    reserved_at: now,
    purchased_at: null,
    gifted_at: null,
    created_at: now,
    updated_at: now,
  }
  writeJson(SHOPPING_KEY, [item, ...getAllLocalShopping()])
  return item
}

function getAllLocalWishlist(): WishlistItem[] {
  return readJson<WishlistItem[]>(WISHLIST_KEY, [])
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
  upsertLocalOccasion({
    id: 'demo-occ-birthday',
    person_id: DEMO_PERSON_ID,
    title: 'تولد',
    occasion_date: birthDate,
    repeats_yearly: true,
    source: 'birthday',
    created_at: now,
    updated_at: now,
  })
  upsertLocalOccasion({
    id: 'demo-occ-work',
    person_id: DEMO_PERSON_ID,
    title: 'سالگرد شروع کار',
    occasion_date: `${new Date().getFullYear()}-06-12`,
    repeats_yearly: true,
    source: 'manual',
    created_at: now,
    updated_at: now,
  })
}
