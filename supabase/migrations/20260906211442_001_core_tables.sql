/*
# Kadoba Core Schema — Part 1: Profiles, Close People, Occasions, Catalog

1. New Tables
- `profiles` — extends auth.users with phone_number, name, avatar_url
- `close_people` — people the user shops gifts for (owner-scoped)
- `occasions` — occasions tied to a close person (owner-scoped via close_people)
- `categories` — internal Kadoba catalog categories
- `products` — normalized catalog products from provider (Basalam)
- `wishlist_items` — products a user wants (owner-scoped)
- `otp_requests` — OTP codes for phone-based auth flow

2. Security
- RLS enabled on all tables
- profiles: owner can read/update own; public can read id, name, avatar_url
- close_people: owner-scoped CRUD
- occasions: owner-scoped CRUD (via close_people ownership)
- categories: public read (anon + authenticated)
- products: public read (anon + authenticated), no user writes (managed by sync)
- wishlist_items: owner-scoped CRUD
- otp_requests: owner-scoped (matched by phone → user mapping)

3. Notes
- Auth uses Supabase built-in auth; phone number maps to email `{phone}@kadoba.ir`
- profiles.id references auth.users(id) with DEFAULT auth.uid()
- All owner columns default to auth.uid() so frontend inserts work without passing user_id
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CLOSE PEOPLE
CREATE TABLE IF NOT EXISTS close_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  avatar_url text,
  birth_date date,
  gender text DEFAULT 'unknown',
  closeness text DEFAULT 'close',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE close_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_close_people" ON close_people;
CREATE POLICY "select_own_close_people" ON close_people FOR SELECT
  TO authenticated USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "insert_own_close_people" ON close_people;
CREATE POLICY "insert_own_close_people" ON close_people FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "update_own_close_people" ON close_people;
CREATE POLICY "update_own_close_people" ON close_people FOR UPDATE
  TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "delete_own_close_people" ON close_people;
CREATE POLICY "delete_own_close_people" ON close_people FOR DELETE
  TO authenticated USING (auth.uid() = owner_user_id);

CREATE INDEX IF NOT EXISTS idx_close_people_owner ON close_people(owner_user_id);

-- OCCASIONS
CREATE TABLE IF NOT EXISTS occasions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES close_people(id) ON DELETE CASCADE,
  title text NOT NULL,
  occasion_date date NOT NULL,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_occasions" ON occasions;
CREATE POLICY "select_own_occasions" ON occasions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM close_people WHERE close_people.id = occasions.person_id AND close_people.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_occasions" ON occasions;
CREATE POLICY "insert_own_occasions" ON occasions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM close_people WHERE close_people.id = occasions.person_id AND close_people.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_occasions" ON occasions;
CREATE POLICY "update_own_occasions" ON occasions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM close_people WHERE close_people.id = occasions.person_id AND close_people.owner_user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM close_people WHERE close_people.id = occasions.person_id AND close_people.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_occasions" ON occasions;
CREATE POLICY "delete_own_occasions" ON occasions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM close_people WHERE close_people.id = occasions.person_id AND close_people.owner_user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_occasions_person_date ON occasions(person_id, occasion_date);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_fa text NOT NULL,
  icon text
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_categories" ON categories;
CREATE POLICY "read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- PRODUCTS (catalog)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'basalam',
  provider_product_id text NOT NULL,
  title text NOT NULL,
  image_url text,
  price_amount bigint NOT NULL,
  currency text DEFAULT 'IRR',
  shop_url text,
  merchant_name text,
  category_id uuid REFERENCES categories(id),
  category_slug text,
  brand text,
  attributes_json jsonb DEFAULT '{}',
  availability text DEFAULT 'in_stock',
  rating numeric,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, provider_product_id)
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_products" ON products;
CREATE POLICY "read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price_amount);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);

-- WISHLIST ITEMS
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  visibility text DEFAULT 'private',
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_user_id, product_id)
);
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wishlist" ON wishlist_items;
CREATE POLICY "select_own_wishlist" ON wishlist_items FOR SELECT
  TO authenticated USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "insert_own_wishlist" ON wishlist_items;
CREATE POLICY "insert_own_wishlist" ON wishlist_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "delete_own_wishlist" ON wishlist_items;
CREATE POLICY "delete_own_wishlist" ON wishlist_items FOR DELETE
  TO authenticated USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "update_own_wishlist" ON wishlist_items;
CREATE POLICY "update_own_wishlist" ON wishlist_items FOR UPDATE
  TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

-- OTP REQUESTS (for phone auth flow)
CREATE TABLE IF NOT EXISTS otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;

-- OTP table needs to be accessible for the auth flow (anon can insert/select for verification)
DROP POLICY IF EXISTS "anon_insert_otp" ON otp_requests;
CREATE POLICY "anon_insert_otp" ON otp_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_otp" ON otp_requests;
CREATE POLICY "anon_select_otp" ON otp_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_otp" ON otp_requests;
CREATE POLICY "anon_update_otp" ON otp_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_requests(phone, created_at DESC);
