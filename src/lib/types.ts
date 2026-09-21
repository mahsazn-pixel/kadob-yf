export interface Profile {
  id: string
  phone_number: string
  name: string | null
  avatar_url: string | null
  birth_date: string | null
  created_at: string
  updated_at: string
}

export interface ClosePerson {
  id: string
  owner_user_id: string
  linked_user_id: string | null
  name: string
  phone: string | null
  avatar_url: string | null
  birth_date: string | null
  gender: string
  closeness: string
  created_at: string
  updated_at: string
}

export const CLOSENESS_OPTIONS = [
  { v: 'very_close', l: 'صمیمی' },
  { v: 'formal', l: 'رسمی' },
] as const

export function closenessLabel(value: string): string {
  return value === 'very_close' ? 'صمیمی' : 'رسمی'
}

export function normalizeCloseness(value: string): 'very_close' | 'formal' {
  return value === 'very_close' ? 'very_close' : 'formal'
}

export interface Occasion {
  id: string
  person_id: string
  title: string
  occasion_date: string
  repeats_yearly?: boolean
  source: string
  shared?: boolean
  created_at: string
  updated_at: string
}

export type GreetingStatus = 'pending' | 'approved' | 'rejected'

export interface Greeting {
  id: string
  sender_user_id: string
  sender_name: string
  receiver_person_id: string
  receiver_user_id: string | null
  occasion_id: string | null
  occasion_title: string | null
  message: string
  status: GreetingStatus
  created_at: string
  updated_at: string
}

export type MyOccasionVisibility = 'public' | 'very_close'

export interface MyOccasion {
  id: string
  owner_user_id: string
  title: string
  occasion_date: string
  repeats_yearly: boolean
  visibility: MyOccasionVisibility
  created_at: string
  updated_at: string
}

export const PERSIAN_MONTHS = [
  { value: '01', label: 'فروردین' },
  { value: '02', label: 'اردیبهشت' },
  { value: '03', label: 'خرداد' },
  { value: '04', label: 'تیر' },
  { value: '05', label: 'مرداد' },
  { value: '06', label: 'شهریور' },
  { value: '07', label: 'مهر' },
  { value: '08', label: 'آبان' },
  { value: '09', label: 'آذر' },
  { value: '10', label: 'دی' },
  { value: '11', label: 'بهمن' },
  { value: '12', label: 'اسفند' },
]

export interface Product {
  id: string
  provider: string
  provider_product_id: string
  title: string
  image_url: string | null
  price_amount: number
  currency: string
  shop_url: string | null
  merchant_name: string | null
  category_id: string | null
  category_slug: string | null
  brand: string | null
  attributes_json: Record<string, unknown>
  availability: string
  rating: number | null
  updated_at: string
}

export interface Category {
  id: string
  slug: string
  name_fa: string
  icon: string | null
}

export interface WishlistItem {
  id: string
  owner_user_id: string
  product_id: string
  product: Product | null
  visibility: string
  created_at: string
}

export interface DiscoverySession {
  id: string
  user_id: string
  receiver_id: string
  filters_json: Record<string, unknown>
  status: string
  shown_count: number
  max_cards: number
  created_at: string
  completed_at: string | null
}

export interface UserInteraction {
  id: string
  user_id: string
  receiver_id: string
  product_id: string
  reaction_type: string
  session_id: string
  timestamp: string
}

export interface ShoppingListItem {
  id: string
  user_id: string
  receiver_id: string
  product_id: string
  product: Product | null
  receiver: ClosePerson | null
  status: string
  session_id: string | null
  reserved_at: string | null
  purchased_at: string | null
  gifted_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  payload_json: Record<string, unknown>
  scheduled_at: string
  sent_at: string | null
  status: string
  created_at: string
}

export interface ReceivedGift {
  id: string
  receiver_user_id: string
  giver_user_id: string
  giver_name: string
  product_id: string
  product: Product | null
  shopping_item_id: string | null
  confirmed: boolean
  rejected?: boolean
  created_at: string
}

export type ReactionType = 'no' | 'good' | 'great' | 'the_one'

export const REACTION_LABELS: Record<ReactionType, string> = {
  no: 'نه',
  good: 'خوبه',
  great: 'عالی',
  the_one: 'خودشه',
}

export const REACTION_WEIGHTS: Record<ReactionType, number> = {
  no: -2,
  good: 1,
  great: 3,
  the_one: 10,
}

export const REACTION_COLORS: Record<ReactionType, string> = {
  no: 'bg-error-500',
  good: 'bg-secondary-500',
  great: 'bg-success-500',
  the_one: 'bg-primary-500',
}

export const REACTION_ORDER: ReactionType[] = ['no', 'good', 'great', 'the_one']

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان'
}

export function pad2(value: string | number): string {
  return String(value).padStart(2, '0')
}

export function parseMonthDay(dateStr: string): { month: string; day: string } {
  const parts = dateStr.split('-')
  if (parts.length >= 3) return { month: pad2(parts[1]), day: pad2(parts[2].slice(0, 2)) }
  if (parts.length === 2) return { month: pad2(parts[0]), day: pad2(parts[1].slice(0, 2)) }
  const date = new Date(dateStr)
  return { month: pad2(date.getMonth() + 1), day: pad2(date.getDate()) }
}

export function toMonthDay(month: string | number, day: string | number): string {
  return `${pad2(month)}-${pad2(day)}`
}

export function sameMonthDay(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const left = parseMonthDay(a)
  const right = parseMonthDay(b)
  return left.month === right.month && left.day === right.day
}

export function composeOccasionDate(month: string | number, day: string | number): string {
  const year = new Date().getFullYear()
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function isRepeating(occ: { repeats_yearly?: boolean; source?: string }): boolean {
  if (typeof occ.repeats_yearly === 'boolean') return occ.repeats_yearly
  return occ.source === 'birthday'
}

export function formatDate(dateStr: string): string {
  return formatMonthDay(dateStr)
}

export function formatMonthDay(dateStr: string): string {
  const { month, day } = parseMonthDay(dateStr)
  const monthLabel = PERSIAN_MONTHS.find(m => m.value === month)?.label || month
  return `${Number(day)} ${monthLabel}`
}

export function formatOccasionDate(occ: { occasion_date: string; repeats_yearly?: boolean; source?: string }): string {
  const dateLabel = formatMonthDay(occ.occasion_date)
  return isRepeating(occ) ? `${dateLabel} • هر سال` : dateLabel
}

export function formatRemainingTime(days: number): string {
  if (days === 0) return 'امروز'
  if (days === 1) return 'فردا'
  if (days === -1) return 'دیروز'
  if (days > 1) return `${days} روز دیگر`
  return `${Math.abs(days)} روز پیش`
}

export function nextOccasionDate(dateStr: string, repeatsYearly = true): Date {
  const { month, day } = parseMonthDay(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(now.getFullYear(), Number(month) - 1, Number(day))
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < -1 && repeatsYearly) {
    target.setFullYear(now.getFullYear() + 1)
  }
  return target
}

export function daysUntil(dateStr: string, repeatsYearly = true): number {
  const target = nextOccasionDate(dateStr, repeatsYearly)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function daysUntilOccasion(occ: { occasion_date: string; repeats_yearly?: boolean; source?: string }): number {
  return daysUntil(occ.occasion_date, isRepeating(occ))
}

export function isUpcomingOccasion(occ: { occasion_date: string; repeats_yearly?: boolean; source?: string }): boolean {
  const days = daysUntilOccasion(occ)
  if (days >= -1) return true
  return false
}

export function nearestUpcomingDays(occasions: { occasion_date: string; repeats_yearly?: boolean; source?: string }[]): number | null {
  const days = occasions.map(daysUntilOccasion).filter(d => d >= -1)
  if (days.length === 0) return null
  return Math.min(...days)
}

export function sortPeopleByNearestOccasion<T extends { id: string; name: string }>(
  people: T[],
  occasions: { person_id: string; occasion_date: string; repeats_yearly?: boolean; source?: string }[],
): T[] {
  const grouped = new Map<string, typeof occasions>()
  for (const occ of occasions) {
    const list = grouped.get(occ.person_id) || []
    list.push(occ)
    grouped.set(occ.person_id, list)
  }
  return [...people].sort((a, b) => {
    const aSelf = a.name === 'خودم'
    const bSelf = b.name === 'خودم'
    if (aSelf !== bSelf) return aSelf ? -1 : 1
    const aDays = nearestUpcomingDays(grouped.get(a.id) || [])
    const bDays = nearestUpcomingDays(grouped.get(b.id) || [])
    if (aDays === null && bDays === null) return 0
    if (aDays === null) return 1
    if (bDays === null) return -1
    return aDays - bDays
  })
}
