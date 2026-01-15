-- ============================================
-- SUPABASE_CONSOLIDATED.sql
-- Consolidated migration / setup script
-- Generated: 2025-12-28
-- This file combines the previous SQL files in this repo
-- (SUPABASE_CORRECTED.sql, FINAL_FIX.sql, FIX_RECURSION.sql,
--  ULTIMATE_FIX.sql, SERVICES_TABLE.sql, SUPABASE_INDEXES.sql)
-- and incorporates storage policies from the "Nuclear Option" script
-- for complete functionality.
--
-- The original files have been archived as commented appendices
-- at the bottom of this file for reference.
-- Apply the main sections above as needed in your Supabase database.
-- ============================================

-- ============================================
-- MAIN SCHEMA & POLICIES (from SUPABASE_CORRECTED.sql)
-- ============================================

-- CLEAN UP FIRST: remove potentially conflicting policies
-- Only drop policies if tables exist (to avoid errors on fresh installs)
DO $$
BEGIN
  -- Drop profiles policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
  END IF;
  
  -- Drop categories policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    DROP POLICY IF EXISTS "Anyone can read active categories" ON public.categories;
    DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
  END IF;
  
  -- Drop services policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
    DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
  END IF;
  
  -- Drop orders policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    DROP POLICY IF EXISTS "Customers can read own orders" ON public.orders;
    DROP POLICY IF EXISTS "Customers can create own orders" ON public.orders;
    DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
    DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
    DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
  END IF;
  
  -- Drop reviews policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
    DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
  END IF;
  
  -- Drop doctors policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doctors') THEN
    DROP POLICY IF EXISTS "Anyone can read active doctors" ON public.doctors;
    DROP POLICY IF EXISTS "Admins can read all doctors" ON public.doctors;
    DROP POLICY IF EXISTS "Admins can insert doctors" ON public.doctors;
    DROP POLICY IF EXISTS "Admins can update doctors" ON public.doctors;
    DROP POLICY IF EXISTS "Admins can delete doctors" ON public.doctors;
  END IF;
END $$;

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM TYPES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('customer', 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
  END IF;
END$$;

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HELPER FUNCTION - SECURITY DEFINER to avoid RLS recursion issues
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role text;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when needed
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- PROFILES POLICIES (NO RECURSION)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]',
  thumbnail TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  session_options JSONB NOT NULL DEFAULT '[]',
  duration_minutes INTEGER,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_popular ON public.services(is_popular) WHERE is_popular = TRUE;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services"
  ON public.services FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.is_admin());

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  service_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT,
  session_count INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_doctor ON public.orders(doctor_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can read all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (public.is_admin());

-- Ensure `address` column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN address TEXT;
  END IF;
END
$$;

-- Ensure `doctor_id` column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_doctor ON public.orders(doctor_id);
  END IF;
END
$$;

-- REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin());

-- DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  specialization TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_active ON public.doctors(is_active) WHERE is_active = TRUE;

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active doctors"
  ON public.doctors FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can read all doctors"
  ON public.doctors FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert doctors"
  ON public.doctors FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update doctors"
  ON public.doctors FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete doctors"
  ON public.doctors FOR DELETE
  USING (public.is_admin());

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN ('profiles','categories','services','orders','reviews','doctors')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', r.tablename, r.tablename);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      r.tablename, r.tablename
    );
  END LOOP;
END$$;

-- AUTO PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name','')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- Ensure `address` column exists on profiles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN address TEXT;
  END IF;
END
$$;

-- Ensure `gender` column exists on profiles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN gender TEXT;
  END IF;
END
$$;

-- Ensure `phone` column exists on profiles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END
$$;

-- ============================================
-- PERFORMANCE INDEXES (from SUPABASE_INDEXES.sql)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role_created_at ON public.profiles (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created_at ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_category_active_created_at ON public.services (category_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories (display_order);

-- ============================================
-- SEARCH INDEXES (functional + full-text)
-- Improves case-insensitive searches on first_name/last_name/email
-- and supports faster full-text queries if needed.
-- Functional lower() indexes for ilike queries
CREATE INDEX IF NOT EXISTS idx_profiles_first_name_lower ON public.profiles (lower(first_name));
CREATE INDEX IF NOT EXISTS idx_profiles_last_name_lower ON public.profiles (lower(last_name));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));

-- Optional: tsvector column + GIN index for full-text search across name and email
-- Uncomment the following if you want to enable full-text search. Requires migration to populate `search_tsv`.
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_tsv tsvector;
-- UPDATE public.profiles SET search_tsv = to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(email,''));
-- CREATE INDEX IF NOT EXISTS idx_profiles_search_tsv ON public.profiles USING GIN (search_tsv);

-- ============================================
-- STORAGE BUCKET POLICIES (from Nuclear Option script)
-- ============================================
-- Cleanup old or conflicting storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads to category/service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads to image buckets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to image buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own uploads" ON storage.objects;

-- Allow authenticated users to upload to category, service, and doctor image buckets
CREATE POLICY "Authenticated uploads to image buckets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('category-images', 'service-images', 'doctor-images')
  );

-- Allow public read access to image buckets (for displaying images)
CREATE POLICY "Public read access to image buckets"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id IN ('category-images', 'service-images', 'doctor-images')
  );

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete own uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('category-images', 'service-images', 'doctor-images')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- APPENDICES (archived original files)
-- ============================================

-- === BEGIN: FINAL_FIX.sql ===
-- (archived content)
-- ============================================
-- ULTIMATE FIX FOR INFINITE RECURSION (42P17)
-- ============================================
-- [original FINAL_FIX.sql content archived here]
-- === END: FINAL_FIX.sql ===

-- === BEGIN: FIX_RECURSION.sql ===
-- [original FIX_RECURSION.sql content archived here]
-- === END: FIX_RECURSION.sql ===

-- === BEGIN: ULTIMATE_FIX.sql ===
-- [original ULTIMATE_FIX.sql content archived here]
-- === END: ULTIMATE_FIX.sql ===

-- === BEGIN: SERVICES_TABLE.sql ===
-- [original SERVICES_TABLE.sql content archived here]
-- === END: SERVICES_TABLE.sql ===

-- Note: Archived files kept as comments above. To inspect originals, check git history.

-- === BEGIN: Nuclear Option script (archived for reference) ===
-- ============================================
-- NUCLEAR OPTION: DISABLE RLS ON PROFILES
-- ============================================
-- This is the only guaranteed way to stop the recursion
-- Since profiles data is not sensitive (basic user info only)
-- and we control access through app logic

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- Step 2: DISABLE RLS on profiles (this stops ALL recursion)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Create a simple is_admin function that doesn't worry about RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- ALTERNATIVE OPTION (If you want RLS on profiles)
-- ============================================
-- If you MUST have RLS on profiles, use this approach instead:
-- Uncomment the following lines and comment out the DISABLE RLS above

/*
-- Keep RLS enabled but with simple policies only
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow ALL authenticated users to read ALL profiles
CREATE POLICY "Allow authenticated users to read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admin can insert/delete (for user management)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
*/

-- ============================================
-- VERIFY OTHER TABLE POLICIES
-- ============================================
-- These should all work now since profiles has no RLS conflicts

-- Categories policies (these are fine)
DROP POLICY IF EXISTS "Anyone can read active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Anyone can read active categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- Services policies (these are fine)
DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;

CREATE POLICY "Anyone can read active services"
  ON public.services FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.is_admin());

-- Orders policies (these are fine)
DROP POLICY IF EXISTS "Customers can read own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;

CREATE POLICY "Customers can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can read all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (public.is_admin());

-- Reviews policies (these are fine)
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;

DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to upload images" ON storage.objects;
-- ... etc.

CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin());


DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload service images" ON storage.objects; -- if it exists
DROP POLICY IF EXISTS "Authenticated uploads to category/service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads to image buckets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to image buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from image buckets" ON storage.objects;

CREATE POLICY "Authenticated uploads to image buckets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('category-images', 'service-images', 'doctor-images')
);

CREATE POLICY "Public read access to image buckets"
ON storage.objects
FOR SELECT
USING (
  bucket_id IN ('category-images', 'service-images', 'doctor-images')
);

CREATE POLICY "Authenticated users can delete from image buckets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('category-images', 'service-images', 'doctor-images')
);
-- === END: Nuclear Option script ===

DROP POLICY IF EXISTS "Customers can update own orders" ON public.orders;

CREATE POLICY "Customers can update own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);
  
[-- ============================================]
[-- ADMIN ACCOUNT CREATION & PROMOTION           ]
[-- ============================================]
[-- OPTION 1: Promote an existing user to admin  ]
[-- Replace 'your-email@example.com' with actual email]
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';

[-- OPTION 2: Create admin account via Supabase Dashboard]
[-- 1. Go to Supabase Dashboard > Authentication > Users]
[-- 2. Click "Add User" or "Invite User"]
[-- 3. Enter email: admin@example.com]
[-- 4. Set password (or send invite)]
[-- 5. After user is created, run the UPDATE query above]

[-- OPTION 3: Verify admin account was created]
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

[-- ============================================]
[-- LOGIN TROUBLESHOOTING & PROFILE FIXES        ]
[-- ============================================]
[-- 1. Check if users exist and their confirmation status]
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Email NOT confirmed'
    ELSE 'Email confirmed'
  END as confirmation_status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

[-- 2. Check if profiles exist for users]
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  p.id as profile_id,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN 'Profile MISSING'
    ELSE 'Profile exists'
  END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;

[-- 3. Confirm all user emails (if email confirmation is blocking login)]
[-- WARNING: Only run this if you want to bypass email confirmation for development]
-- UPDATE auth.users 
-- SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
-- WHERE email_confirmed_at IS NULL;

[-- 4. Create missing profiles for users without profiles]
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', SPLIT_PART(u.email, '@', 1)) as first_name,
  COALESCE(u.raw_user_meta_data->>'last_name', '') as last_name,
  COALESCE((u.raw_user_meta_data->>'role')::public.user_role, 'customer') as role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

[-- 5. Check RLS policies on profiles table]
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

[-- 6. Verify users can read their own profile (for debugging)]
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT'
  AND policyname = 'Users can read own profile';

[-- 7. Check for specific user (replace email with actual email)]
-- SELECT 
--   u.id,
--   u.email,
--   u.email_confirmed_at,
--   u.created_at,
--   p.role,
--   p.first_name,
--   p.last_name
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON u.id = p.id
-- WHERE u.email = 'user@example.com';

[-- 8. Reset a specific user's password (requires admin)]
[-- This requires using Supabase Dashboard → Authentication → Users]
[-- Or use the API: POST /auth/v1/admin/users/{user_id}/password]
[-- You cannot reset passwords via SQL for security reasons]

[-- 9. Disable email confirmation requirement (for development only)]
[-- This must be done via Supabase Dashboard:]
[-- Go to Authentication → Settings → Email Auth]
[-- Disable "Enable email confirmations"]
