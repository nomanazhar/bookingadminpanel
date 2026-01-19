-- Allow users to update their own profile row
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id);
-- ============================================
-- SUPABASE_CONSOLIDATED_FINAL_SAFE_v2.sql
-- Final version with fixed storage policies
-- Thorough cleanup + safe recreation of everything
-- Last update: solves storage policy duplicate name error
-- ============================================

-- ============================================
-- 1. COMPLETE CLEANUP - Remove ALL known existing/old policies
-- ============================================
DO $$
BEGIN
  -- Profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Users read own"                 ON public.profiles;
    DROP POLICY IF EXISTS "Users update own"               ON public.profiles;
    DROP POLICY IF EXISTS "Admins read all profiles"       ON public.profiles;
    DROP POLICY IF EXISTS "Users can read own profile"     ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
    DROP POLICY IF EXISTS "Admins can read all profiles"   ON public.profiles;
  END IF;

  -- Categories
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    DROP POLICY IF EXISTS "Public read active categories"  ON public.categories;
    DROP POLICY IF EXISTS "Admins full access categories"  ON public.categories;
    DROP POLICY IF EXISTS "Anyone can read active categories" ON public.categories;
    DROP POLICY IF EXISTS "Admins can manage categories"   ON public.categories;
  END IF;

  -- Services
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    DROP POLICY IF EXISTS "Public read active services"    ON public.services;
    DROP POLICY IF EXISTS "Admins full access services"    ON public.services;
    DROP POLICY IF EXISTS "Anyone can read active services" ON public.services;
    DROP POLICY IF EXISTS "Admins can manage services"     ON public.services;
  END IF;

  -- Subservices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subservices') THEN
    DROP POLICY IF EXISTS "Public read subservices"        ON public.subservices;
    DROP POLICY IF EXISTS "Admins full access subservices" ON public.subservices;
  END IF;

  -- Orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
    DROP POLICY IF EXISTS "Own orders read"                ON public.orders;
    DROP POLICY IF EXISTS "Own orders create"              ON public.orders;
    DROP POLICY IF EXISTS "Own orders update"              ON public.orders;
    DROP POLICY IF EXISTS "Admins read all orders"         ON public.orders;
    DROP POLICY IF EXISTS "Admins update all orders"       ON public.orders;
    DROP POLICY IF EXISTS "Admins insert orders"           ON public.orders;
    DROP POLICY IF EXISTS "Customers can read own orders"  ON public.orders;
    DROP POLICY IF EXISTS "Customers can create own orders" ON public.orders;
    DROP POLICY IF EXISTS "Customers can update own orders" ON public.orders;
  END IF;

  -- Reviews
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DROP POLICY IF EXISTS "Public read reviews"            ON public.reviews;
    DROP POLICY IF EXISTS "Own create review"              ON public.reviews;
    DROP POLICY IF EXISTS "Own update review"              ON public.reviews;
    DROP POLICY IF EXISTS "Admins full reviews"            ON public.reviews;
    DROP POLICY IF EXISTS "Anyone can read reviews"        ON public.reviews;
    DROP POLICY IF EXISTS "Customers can create reviews"   ON public.reviews;
    DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
  END IF;

  -- Doctors
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doctors') THEN
    DROP POLICY IF EXISTS "Public read active doctors"     ON public.doctors;
    DROP POLICY IF EXISTS "Admins manage doctors"          ON public.doctors;
    DROP POLICY IF EXISTS "Anyone can read active doctors" ON public.doctors;
    DROP POLICY IF EXISTS "Admins can read all doctors"    ON public.doctors;
    DROP POLICY IF EXISTS "Admins can insert doctors"      ON public.doctors;
    DROP POLICY IF EXISTS "Admins can update doctors"      ON public.doctors;
    DROP POLICY IF EXISTS "Admins can delete doctors"      ON public.doctors;
  END IF;
END $$;

-- ============================================
-- 2. EXTENSIONS & ENUMS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('customer', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
  END IF;
END $$;

-- ============================================
-- 3. TABLES (IF NOT EXISTS - safe)
-- ============================================

CREATE TABLE IF NOT EXISTS public.subservices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  phone TEXT,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  subservice_id UUID REFERENCES public.subservices(id) ON DELETE SET NULL,
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

-- ============================================
-- 4. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subservices_service_id ON public.subservices(service_id);
CREATE INDEX IF NOT EXISTS idx_subservices_name_lower ON public.subservices(lower(name));
CREATE INDEX IF NOT EXISTS idx_subservices_price ON public.subservices(price);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_popular ON public.services(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_doctor ON public.orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON public.doctors(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_role_created_at ON public.profiles (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created_at ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_category_active_created_at ON public.services (category_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories (display_order);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower_unique ON public.profiles (lower(email));

-- ============================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
  FOR r IN SELECT tablename FROM pg_tables 
           WHERE schemaname = 'public' 
           AND tablename IN ('profiles','categories','services','orders','reviews','doctors','subservices')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', r.tablename, r.tablename);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      r.tablename, r.tablename
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT := split_part(NEW.email, '@', 1);
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), default_name),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. ROW LEVEL SECURITY - SAFE CREATION
-- ============================================

ALTER TABLE public.subservices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors    ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Subservices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subservices' AND policyname = 'Public read subservices') THEN
    CREATE POLICY "Public read subservices" ON public.subservices FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subservices' AND policyname = 'Admins full access subservices') THEN
    CREATE POLICY "Admins full access subservices" ON public.subservices FOR ALL USING (public.is_admin());
  END IF;

  -- Profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users read own') THEN
    CREATE POLICY "Users read own" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users update own') THEN
    CREATE POLICY "Users update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins read all profiles') THEN
    CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
  END IF;

  -- Categories
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Public read active categories') THEN
    CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Admins full access categories') THEN
    CREATE POLICY "Admins full access categories" ON public.categories FOR ALL USING (public.is_admin());
  END IF;

  -- Services
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'Public read active services') THEN
    CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'Admins full access services') THEN
    CREATE POLICY "Admins full access services" ON public.services FOR ALL USING (public.is_admin());
  END IF;

  -- Orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Own orders read') THEN
    CREATE POLICY "Own orders read" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Own orders create') THEN
    CREATE POLICY "Own orders create" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Own orders update') THEN
    CREATE POLICY "Own orders update" ON public.orders FOR UPDATE USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins read all orders') THEN
    CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins update all orders') THEN
    CREATE POLICY "Admins update all orders" ON public.orders FOR UPDATE USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Admins insert orders') THEN
    CREATE POLICY "Admins insert orders" ON public.orders FOR INSERT WITH CHECK (public.is_admin());
  END IF;

  -- Reviews
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'Public read reviews') THEN
    CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'Own create review') THEN
    CREATE POLICY "Own create review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'Own update review') THEN
    CREATE POLICY "Own update review" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'Admins full reviews') THEN
    CREATE POLICY "Admins full reviews" ON public.reviews FOR ALL USING (public.is_admin());
  END IF;

  -- Doctors
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctors' AND policyname = 'Public read active doctors') THEN
    CREATE POLICY "Public read active doctors" ON public.doctors FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctors' AND policyname = 'Admins manage doctors') THEN
    CREATE POLICY "Admins manage doctors" ON public.doctors FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- ============================================
-- 7. STORAGE POLICIES - FIXED: Drop before create
-- ============================================

-- IMPORTANT: Explicitly drop policies by exact name before recreating
DROP POLICY IF EXISTS "Auth upload to image buckets"           ON storage.objects;
DROP POLICY IF EXISTS "Public read image buckets"              ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own uploads"                ON storage.objects;
-- Also drop any very old variant names just in case
DROP POLICY IF EXISTS "Authenticated uploads to image buckets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to image buckets"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own uploads" ON storage.objects;

-- Now safely (re)create them
CREATE POLICY "Auth upload to image buckets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('category-images', 'service-images', 'doctor-images'));

CREATE POLICY "Public read image buckets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('category-images', 'service-images', 'doctor-images'));

CREATE POLICY "Auth delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('category-images', 'service-images', 'doctor-images')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- END OF SCRIPT - This should now run successfully multiple times
-- ============================================