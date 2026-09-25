import { Product } from './types'

function p(
  id: string,
  title: string,
  image_url: string,
  price_amount: number,
  merchant_name: string,
  category_slug: string,
): Product {
  return {
    id,
    provider: 'basalam',
    provider_product_id: id,
    title,
    image_url,
    price_amount,
    currency: 'IRT',
    shop_url: `https://basalam.com/${id}`,
    merchant_name,
    category_id: null,
    category_slug,
    brand: null,
    attributes_json: {},
    availability: 'in_stock',
    rating: null,
    updated_at: '2026-09-06T00:00:00.000Z',
  }
}

export const LOCAL_PRODUCTS: Product[] = [
  p('p001', 'گردنبند طلا ۱۸ عیار مدل ستاره', 'https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg', 4500000, 'طلا فروشی زرین', 'jewelry'),
  p('p002', 'دستبند چرمی مردانه مشکی', 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg', 850000, 'چرم لایف', 'accessories'),
  p('p003', 'عطر زنانه فرانسوی ۵۰ میلی‌لیتر', 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg', 1200000, 'پرفیوم سنتر', 'perfume'),
  p('p004', 'کیف دستی زنانه چرمی قهوه‌ای', 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg', 1800000, 'چرم لایف', 'bag'),
  p('p005', 'هدفون بی‌سیم نویز کنسلینگ', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 3200000, 'دیجی‌مارکت', 'digital'),
  p('p006', 'کتاب رمان عشق در زمان وبا', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg', 320000, 'کتابفروشی نیک', 'book'),
  p('p007', 'ست لوازم آرایشی برند وارداتی', 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg', 950000, 'بیوتی‌شاپ', 'beauty'),
  p('p008', 'گلدان سرامیکی دست‌ساز طرح میناکاری', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 680000, 'هنر دست', 'decor'),
  p('p009', 'ساعت مچی اسپرت ضدآب', 'https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg', 2100000, 'تایم‌واچ', 'accessories'),
  p('p010', 'اسپری ضدعفونی‌کننده دست الکلی ۵۰۰ میلی‌لیتر', 'https://images.pexels.com/photos/4047/feet-shoe-pencil-pen.jpg', 120000, 'کلین‌مارکت', 'health'),
  p('p011', 'مجموعه شکلات و شیرینی لوکس', 'https://images.pexels.com/photos/230841/pexels-photo-230841.jpeg', 540000, 'شوکولاتیه', 'food'),
  p('p012', 'کنسول بازی دسته‌دار قابل حمل', 'https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg', 5500000, 'گیم‌لند', 'gaming'),
  p('p013', 'اسباب‌بازی آموزشی کودک ۳ تا ۶ سال', 'https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg', 760000, 'کیدز‌لند', 'kids'),
  p('p014', 'گل آپارتمانی سانسوریا در گلدان سفالی', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 320000, 'گل‌خانه سبز', 'plant'),
  p('p015', 'چای‌ساز برقی استیل ضدزنگ', 'https://images.pexels.com/photos/4226856/pexels-photo-4226856.jpeg', 1450000, 'خانه‌آرا', 'home_appliance'),
  p('p016', 'انگشتر نقره عقیق مردانه', 'https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg', 920000, 'نقره‌سازان', 'jewelry'),
  p('p017', 'کفش ورزشی زنانه سبک', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 1650000, 'اسپرت‌لند', 'clothing'),
  p('p018', 'ست چای ایرانی کاسه‌ای ۶ نفره', 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg', 890000, 'خانه‌آرا', 'decor'),
  p('p019', 'پاوربانک ۲۰۰۰۰ میلی‌آمپر فست شارژ', 'https://images.pexels.com/photos/4068314/pexels-photo-4068314.jpeg', 1100000, 'دیجی‌مارکت', 'digital'),
  p('p020', 'کرم مرطوب‌کننده ویتامین E ۱۰۰ میلی‌لیتر', 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg', 280000, 'بیوتی‌شاپ', 'beauty'),
  p('p021', 'دستبند ساعت هوشمند پوششی', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 2800000, 'دیجی‌مارکت', 'digital'),
  p('p022', 'ست خودکار و دفتر چرمی هدیه', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg', 560000, 'کتابفروشی نیک', 'book'),
  p('p023', 'پارکل رژ لب مات برند وارداتی', 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg', 340000, 'بیوتی‌شاپ', 'beauty'),
  p('p024', 'ماگ حرارتی چرمی هدیه', 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg', 420000, 'خانه‌آرا', 'decor'),
  p('p025', 'کوله پشتی لپ‌تاپ ضدآب', 'https://images.pexels.com/photos/290523/pexels-photo-290523.jpeg', 1250000, 'چرم لایف', 'bag'),
  p('p026', 'ست نقره آویز و گردنبند', 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg', 1380000, 'نقره‌سازان', 'jewelry'),
  p('p027', 'ادکلن مردانه خنک ۱۰۰ میلی‌لیتر', 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg', 1750000, 'پرفیوم سنتر', 'perfume'),
  p('p028', 'سرویس قاشق چنگال استیل ۱۲ نفره', 'https://images.pexels.com/photos/4226856/pexels-photo-4226856.jpeg', 2200000, 'خانه‌آرا', 'home_appliance'),
  p('p029', 'پازل ۱۰۰۰ تکه طبیعت', 'https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg', 380000, 'کیدز‌لند', 'kids'),
  p('p030', 'دمنوش گیاهی ۲۵ پاکت', 'https://images.pexels.com/photos/230841/pexels-photo-230841.jpeg', 180000, 'شوکولاتیه', 'food'),
  p('p031', 'کلاه زمستانی پشمی دست‌بافت', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 420000, 'اسپرت‌لند', 'clothing'),
  p('p032', 'گل رز قرمز در باکس هدیه', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 580000, 'گل‌خانه سبز', 'plant'),
  p('p033', 'دستبند تناسب هوشمند ضدآب', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 1900000, 'دیجی‌مارکت', 'digital'),
  p('p034', 'ست شمع معطر و عود', 'https://images.pexels.com/photos/4047/feet-shoe-pencil-pen.jpg', 450000, 'هنر دست', 'decor'),
  p('p035', 'تجهیزات یوگا و مت پوشک', 'https://images.pexels.com/photos/4047/feet-shoe-pencil-pen.jpg', 680000, 'اسپرت‌لند', 'health'),
  p('p036', 'مجموعه دکوراسیان دیواری سه‌بعدی', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 920000, 'هنر دست', 'decor'),
  p('p037', 'کفش چرمی مردانه کلاسیک', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 2400000, 'چرم لایف', 'clothing'),
  p('p038', 'ساعت دیواری چوبی طرح مینیمال', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 540000, 'هنر دست', 'decor'),
  p('p039', 'ست لوازم پخت قنادی ۱۰ تکه', 'https://images.pexels.com/photos/4226856/pexels-photo-4226856.jpeg', 1650000, 'خانه‌آرا', 'home_appliance'),
  p('p040', 'کارت هدیه دیجیتال ۵۰۰ هزار تومانی', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg', 500000, 'کادوبا', 'book'),
]

export type DiscoveryAgeRange = 'under3' | '3to7' | '8to15' | 'over15'
export type DiscoveryGender = 'male' | 'female' | 'unknown'

export function ageRangeFromBirthDate(birthDate: string | null | undefined): DiscoveryAgeRange | null {
  if (!birthDate) return null
  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const monthDiff = now.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1
  if (age < 0) return null
  if (age < 3) return 'under3'
  if (age <= 7) return '3to7'
  if (age <= 15) return '8to15'
  return 'over15'
}

export interface DiscoveryRankFilters {
  budgetMin: number
  budgetMax: number
  ageRange?: string | null
  gender?: string | null
  limit?: number
}

function inferProductGender(title: string, category: string | null): 'male' | 'female' | 'unisex' {
  if (/مردانه/.test(title)) return 'male'
  if (/زنانه|آرایشی|رژ لب/.test(title)) return 'female'
  if (category === 'beauty') return 'female'
  if (category === 'jewelry' && /گردنبند|آویز|طلا/.test(title)) return 'female'
  return 'unisex'
}

function genderScore(title: string, category: string | null, gender?: string | null): number {
  if (!gender || gender === 'unknown') return 0
  const inferred = inferProductGender(title, category)
  if (inferred === 'unisex') return 1
  if (inferred === gender) return 7
  return -10
}

function ageScore(title: string, category: string | null, ageRange?: string | null): number {
  if (!ageRange) return 0
  const cat = category || ''
  const isKidsItem = cat === 'kids' || /کودک|نوزاد|اسباب‌بازی/.test(title)
  if (ageRange === 'under3') {
    if (isKidsItem) return 10
    if (['jewelry', 'perfume', 'beauty', 'digital', 'gaming', 'home_appliance', 'bag', 'clothing'].includes(cat)) return -8
    return -3
  }
  if (ageRange === '3to7') {
    if (isKidsItem) return 9
    if (cat === 'book' || cat === 'food' || cat === 'plant' || cat === 'gaming') return 2
    if (['jewelry', 'perfume', 'beauty', 'home_appliance'].includes(cat)) return -7
    return -1
  }
  if (ageRange === '8to15') {
    if (cat === 'gaming' || cat === 'digital' || isKidsItem) return 7
    if (cat === 'book' || cat === 'clothing' || cat === 'bag' || cat === 'accessories') return 3
    if (['jewelry', 'perfume', 'beauty', 'home_appliance'].includes(cat)) return -4
    return 1
  }
  if (ageRange === 'over15') {
    if (isKidsItem) return -8
    if (['jewelry', 'perfume', 'beauty', 'accessories', 'digital', 'bag'].includes(cat)) return 4
    return 2
  }
  return 0
}

export function scoreProductForDiscovery(
  item: { title: string; category_slug: string | null; price_amount: number },
  filters: { budgetMin: number; budgetMax: number; ageRange?: string | null; gender?: string | null },
): number {
  const { budgetMin, budgetMax, ageRange, gender } = filters
  const mid = (budgetMin + budgetMax) / 2
  const inBudget = item.price_amount >= budgetMin && item.price_amount <= budgetMax
  let score = 0
  if (inBudget) {
    const dist = Math.abs(item.price_amount - mid) / Math.max(mid, 1)
    score += Math.max(0, 5 - dist * 5)
  } else {
    score -= 6
  }
  score += genderScore(item.title, item.category_slug, gender)
  score += ageScore(item.title, item.category_slug, ageRange)
  score += Math.random() * 1.2
  return score
}

export function getCatalogProduct(id: string): Product | undefined {
  return LOCAL_PRODUCTS.find(item => item.id === id)
}

export function rankProductsForDiscovery(
  budgetMin: number,
  budgetMax: number,
  options: { ageRange?: string | null; gender?: string | null; limit?: number } = {},
): Product[] {
  const { ageRange, gender, limit = 20 } = options
  const inBudget = LOCAL_PRODUCTS.filter(item => item.price_amount >= budgetMin && item.price_amount <= budgetMax)
  const scoredInBudget = inBudget
    .map(item => ({ item, score: scoreProductForDiscovery(item, { budgetMin, budgetMax, ageRange, gender }) }))
    .filter(entry => entry.score > -8)
  const pool = scoredInBudget.length >= 4
    ? scoredInBudget
    : LOCAL_PRODUCTS.map(item => ({ item, score: scoreProductForDiscovery(item, { budgetMin, budgetMax, ageRange, gender }) }))
  const ranked = [...pool].sort((a, b) => b.score - a.score)
  const preferKids = ageRange === 'under3' || ageRange === '3to7'
  if (preferKids) {
    return ranked.slice(0, limit).map(entry => entry.item)
  }
  const seen = new Set<string>()
  const diverse: Product[] = []
  const rest: Product[] = []
  for (const entry of ranked) {
    const cat = entry.item.category_slug || 'other'
    if (!seen.has(cat) || diverse.length < 8) {
      diverse.push(entry.item)
      seen.add(cat)
    } else {
      rest.push(entry.item)
    }
  }
  return [...diverse, ...rest].slice(0, limit)
}

export function productToCard(product: Product, position: number) {
  return {
    id: `${product.id}-${position}`,
    product_id: product.id,
    position,
    image_url: product.image_url,
    title: product.title,
    price: { amount: product.price_amount, currency: product.currency },
    merchant: { name: product.merchant_name },
    shop_url: product.shop_url,
    category: product.category_slug,
    availability: product.availability,
  }
}
