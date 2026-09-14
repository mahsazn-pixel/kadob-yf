/*
# Seed Categories and Mock Products

1. Data
- 15 internal Kadoba categories (mapped from Basalam)
- ~40 mock products across categories with realistic Persian titles and prices
- Products use provider='basalam' with mock provider_product_id values

2. Notes
- This seeds the catalog so Discovery works end-to-end without real Basalam credentials
- When real Basalam integration is enabled, these can be replaced/augmented via sync
*/

-- CATEGORIES
INSERT INTO categories (slug, name_fa, icon) VALUES
  ('accessories', 'اکسوری', 'watch'),
  ('bag', 'کیف', 'shopping-bag'),
  ('beauty', 'زیبایی و مراقبت', 'sparkles'),
  ('book', 'کتاب و لوازم تحریر', 'book'),
  ('clothing', 'پوشاک', 'shirt'),
  ('decor', 'دکوری و خانه', 'home'),
  ('digital', 'دیجیتال و گجت', 'smartphone'),
  ('food', 'خوراکی و شکلات', 'cookie'),
  ('gaming', 'گیمینگ', 'gamepad-2'),
  ('health', 'سلامت و تناسب', 'heart-pulse'),
  ('home_appliance', 'لوازم خانگی', 'refrigerator'),
  ('jewelry', 'زیورآلات', 'gem'),
  ('kids', 'کودک و اسباب‌بازی', 'baby'),
  ('perfume', 'عطر و ادکلن', 'spray-can'),
  ('plant', 'گیاه و گل', 'flower')
ON CONFLICT (slug) DO NOTHING;

-- PRODUCTS (mock catalog)
INSERT INTO products (provider, provider_product_id, title, image_url, price_amount, shop_url, merchant_name, category_slug, availability) VALUES
  ('basalam', 'p001', 'گردنبند طلا ۱۸ عیار مدل ستاره', 'https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg', 4500000, 'https://basalam.com/p001', 'طلا فروشی زرین', 'jewelry', 'in_stock'),
  ('basalam', 'p002', 'دستبند چرمی مردانه مشکی', 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg', 850000, 'https://basalam.com/p002', 'چرم لایف', 'accessories', 'in_stock'),
  ('basalam', 'p003', 'عطر زنانه فرانسوی ۵۰ میلی‌لیتر', 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg', 1200000, 'https://basalam.com/p003', 'پرفیوم سنتر', 'perfume', 'in_stock'),
  ('basalam', 'p004', 'کیف دستی زنانه چرمی قهوه‌ای', 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg', 1800000, 'https://basalam.com/p004', 'چرم لایف', 'bag', 'in_stock'),
  ('basalam', 'p005', 'هدفون بی‌سیم نویز کنسلینگ', 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg', 3200000, 'https://basalam.com/p005', 'دیجی‌مارکت', 'digital', 'in_stock'),
  ('basalam', 'p006', 'کتاب رمان عشق در زمان وبا', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg', 320000, 'https://basalam.com/p006', 'کتابفروشی نیک', 'book', 'in_stock'),
  ('basalam', 'p007', 'ست لوازم آرایشی برند وارداتی', 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg', 950000, 'https://basalam.com/p007', 'بیوتی‌شاپ', 'beauty', 'in_stock'),
  ('basalam', 'p008', 'گلدان سرامیکی دست‌ساز طرح میناکاری', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 680000, 'https://basalam.com/p008', 'هنر دست', 'decor', 'in_stock'),
  ('basalam', 'p009', 'ساعت مچی اسپرت ضدآب', 'https://images.pexels.com/photos/277390/pexels-photo-277390.jpeg', 2100000, 'https://basalam.com/p009', 'تایم‌واچ', 'accessories', 'in_stock'),
  ('basalam', 'p010', 'اسپری ضدعفونی‌کننده دست الکلی ۵۰۰ میلی‌لیتر', 'https://images.pexels.com/photos/4047/feet-shoe-pencil-pen.jpg', 120000, 'https://basalam.com/p010', 'کلین‌مارکت', 'health', 'in_stock'),
  ('basalam', 'p011', 'مجموعه شکلات و شیرینی لوکس', 'https://images.pexels.com/photos/230841/pexels-photo-230841.jpeg', 540000, 'https://basalam.com/p011', 'شوکولاتیه', 'food', 'in_stock'),
  ('basalam', 'p012', 'کنسول بازی دسته‌دار قابل حمل', 'https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg', 5500000, 'https://basalam.com/p012', 'گیم‌لند', 'gaming', 'in_stock'),
  ('basalam', 'p013', 'اسباب‌بازی آموزشی کودک ۳ تا ۶ سال', 'https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg', 760000, 'https://basalam.com/p013', 'کیدز‌لند', 'kids', 'in_stock'),
  ('basalam', 'p014', 'گل آپارتمانی سانسوریا در گلدان سفالی', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 320000, 'https://basalam.com/p014', 'گل‌خانه سبز', 'plant', 'in_stock'),
  ('basalam', 'p015', 'چای‌ساز برقی استیل ضدزنگ', 'https://images.pexels.com/photos/4226856/pexels-photo-4226856.jpeg', 1450000, 'https://basalam.com/p015', 'خانه‌آرا', 'home_appliance', 'in_stock'),
  ('basalam', 'p016', 'انگشتر نقره عقیق مردانه', 'https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg', 920000, 'https://basalam.com/p016', 'نقره‌سازان', 'jewelry', 'in_stock'),
  ('basalam', 'p017', 'کفش ورزشی زنانه سبک', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 1650000, 'https://basalam.com/p017', 'اسپرت‌لند', 'clothing', 'in_stock'),
  ('basalam', 'p018', 'ست چای ایرانی کاسه‌ای ۶ نفره', 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg', 890000, 'https://basalam.com/p018', 'خانه‌آرا', 'decor', 'in_stock'),
  ('basalam', 'p019', 'پاوربانک ۲۰۰۰۰ میلی‌آمپر فست شارژ', 'https://images.pexels.com/photos/4068314/pexels-photo-4068314.jpeg', 1100000, 'https://basalam.com/p019', 'دیجی‌مارکت', 'digital', 'in_stock'),
  ('basalam', 'p020', 'کرم مرطوب‌کننده ویتامین E ۱۰۰ میلی‌لیتر', 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg', 280000, 'https://basalam.com/p020', 'بیوتی‌شاپ', 'beauty', 'in_stock'),
  ('basalam', 'p021', 'دستبند ساعت هوشمند پوششی', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 2800000, 'https://basalam.com/p021', 'دیجی‌مارکت', 'digital', 'in_stock'),
  ('basalam', 'p022', 'ست خودکار و دفتر چرمی هدیه', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg', 560000, 'https://basalam.com/p022', 'کتابفروشی نیک', 'book', 'in_stock'),
  ('basalam', 'p023', 'پارکل رژ لب مات برند وارداتی', 'https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg', 340000, 'https://basalam.com/p023', 'بیوتی‌شاپ', 'beauty', 'in_stock'),
  ('basalam', 'p024', 'ماگ حرارتی چرمی هدیه', 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg', 420000, 'https://basalam.com/p024', 'خانه‌آرا', 'decor', 'in_stock'),
  ('basalam', 'p025', 'کوله پشتی لپ‌تاپ ضدآب', 'https://images.pexels.com/photos/290523/pexels-photo-290523.jpeg', 1250000, 'https://basalam.com/p025', 'چرم لایف', 'bag', 'in_stock'),
  ('basalam', 'p026', 'ست نقره آویز و گردنبند', 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg', 1380000, 'https://basalam.com/p026', 'نقره‌سازان', 'jewelry', 'in_stock'),
  ('basalam', 'p027', 'ادکلن مردانه خنک ۱۰۰ میلی‌لیتر', 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg', 1750000, 'https://basalam.com/p027', 'پرفیوم سنتر', 'perfume', 'in_stock'),
  ('basalam', 'p028', 'سرویس قاشق چنگال استیل ۱۲ نفره', 'https://images.pexels.com/photos/4226856/pexels-photo-4226856.jpeg', 2200000, 'https://basalam.com/p028', 'خانه‌آرا', 'home_appliance', 'in_stock'),
  ('basalam', 'p029', 'پازل ۱۰۰۰ تکه طبیعت', 'https://images.pexels.com/photos/3661356/pexels-photo-3661356.jpeg', 380000, 'https://basalam.com/p029', 'کیدز‌لند', 'kids', 'in_stock'),
  ('basalam', 'p030', 'دمنوش گیاهی ۲۵ پاکت', 'https://images.pexels.com/photos/230841/pexels-photo-230841.jpeg', 180000, 'https://basalam.com/p030', 'شوکولاتیه', 'food', 'in_stock'),
  ('basalam', 'p031', 'کلاه زمستانی پشمی دست‌بافت', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 420000, 'https://basalam.com/p031', 'اسپرت‌لند', 'clothing', 'in_stock'),
  ('basalam', 'p032', 'گل رز قرمز در باکس هدیه', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 580000, 'https://basalam.com/p032', 'گل‌خانه سبز', 'plant', 'in_stock'),
  ('basalam', 'p033', 'دستبند تناسب هوشمند ضدآب', 'https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg', 1900000, 'https://basalam.com/p033', 'دیجی‌مارکت', 'digital', 'in_stock'),
  ('basalam', 'p034', 'ست شمع معطر و عود', 'https://images.pexels.com/photos/4047/feet-shoe-pencil-pen.jpg', 450000, 'https://basalam.com/p034', 'هنر دست', 'decor', 'in_stock'),
  ('basalam', 'p035', 'تجهیزات یوگا و مت پوشک', 'https://images.pexels.com/photos/4047/feet-shoe-pencil-pen.jpg', 680000, 'https://basalam.com/p035', 'اسپرت‌لند', 'health', 'in_stock'),
  ('basalam', 'p036', 'مجموعه دکوراسیان دیواری سه‌بعدی', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 920000, 'https://basalam.com/p036', 'هنر دست', 'decor', 'in_stock'),
  ('basalam', 'p037', 'کفش چرمی مردانه کلاسیک', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 2400000, 'https://basalam.com/p037', 'چرم لایف', 'clothing', 'in_stock'),
  ('basalam', 'p038', 'ساعت دیواری چوبی طرح مینیمال', 'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg', 540000, 'https://basalam.com/p038', 'هنر دست', 'decor', 'in_stock'),
  ('basalam', 'p039', 'ست لوازم پخت قنادی ۱۰ تکه', 'https://images.pexels.com/photos/4226856/pexels-photo-4226856.jpeg', 1650000, 'https://basalam.com/p039', 'خانه‌آرا', 'home_appliance', 'in_stock'),
  ('basalam', 'p040', 'کارت هدیه دیجیتال ۵۰۰ هزار تومانی', 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg', 500000, 'https://basalam.com/p040', 'کادوبا', 'book', 'in_stock')
ON CONFLICT (provider, provider_product_id) DO NOTHING;
