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

export interface Occasion {
  id: string
  person_id: string
  title: string
  occasion_date: string
  source: string
  created_at: string
  updated_at: string
}

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

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
