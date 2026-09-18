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
    currency: 'IRR',
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

export function getCatalogProduct(id: string): Product | undefined {
  return LOCAL_PRODUCTS.find(item => item.id === id)
}

export function rankProductsForDiscovery(budgetMin: number, budgetMax: number, limit = 20): Product[] {
  const inBudget = LOCAL_PRODUCTS.filter(item => item.price_amount >= budgetMin && item.price_amount <= budgetMax)
  const pool = inBudget.length >= 6 ? inBudget : LOCAL_PRODUCTS
  const mid = (budgetMin + budgetMax) / 2
  return [...pool]
    .map(item => {
      const dist = Math.abs(item.price_amount - mid) / Math.max(mid, 1)
      return { item, score: Math.max(0, 3 - dist * 3) + Math.random() * 2 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(entry => entry.item)
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
