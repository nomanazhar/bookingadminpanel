-- ============================================
-- SUPABASE SCHEMA - PHONE OTP FIX + LOCATION SUPPORT
-- Updated: January 2026
-- FIXED: subservices.slug is now NON-UNIQUE
-- ============================================

-- ============================================
-- STEP 1: DISABLE THE TRIGGER TEMPORARILY
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- STEP 2: CLEANUP OLD POLICIES
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'profiles','categories','services',
              'subservices','orders','reviews','doctors'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            pol.policyname,
            pol.tablename
        );
    END LOOP;
END $$;

-- ============================================
-- FIX: DROP UNIQUE CONSTRAINT ON subservices.slug
-- (NOT THE INDEX)
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'subservices'
          AND constraint_name = 'subservices_slug_key'
          AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE public.subservices
        DROP CONSTRAINT subservices_slug_key;
    END IF;
END $$;

-- ============================================
-- STORAGE POLICIES CLEANUP
-- ============================================
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload to image buckets" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can read image buckets" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;
END $$;

-- ============================================
-- STEP 3: EXTENSIONS & ENUMS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('customer', 'admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM (
            'pending','confirmed','completed','cancelled'
        );
    END IF;
END $$;

-- ============================================
-- STEP 4: TABLES (WITH LOCATIONS SUPPORT)
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT UNIQUE NOT NULL,
    description   TEXT,
    image_url     TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    locations     TEXT[] NOT NULL DEFAULT '{}',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    slug             TEXT UNIQUE NOT NULL,
    description      TEXT NOT NULL,
    images           JSONB NOT NULL DEFAULT '[]'::jsonb,
    thumbnail        TEXT,
    base_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    session_options  JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_minutes INTEGER,
    locations        TEXT[] NOT NULL DEFAULT '{}',
    is_popular       BOOLEAN NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subservices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL, -- ✅ DUPLICATES ALLOWED
    price       NUMERIC(10,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctors (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name     TEXT NOT NULL,
    last_name      TEXT NOT NULL,
    email          TEXT UNIQUE NOT NULL,
    phone          TEXT,
    specialization TEXT,
    bio            TEXT,
    avatar_url     TEXT,
    locations      TEXT[] NOT NULL DEFAULT '{}',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    first_name  TEXT NOT NULL DEFAULT '',
    last_name   TEXT NOT NULL DEFAULT '',
    role        public.user_role NOT NULL DEFAULT 'customer',
    avatar_url  TEXT,
    phone       TEXT,
    gender      TEXT,
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id       UUID REFERENCES public.services(id) ON DELETE SET NULL,
    subservice_id    UUID REFERENCES public.subservices(id) ON DELETE SET NULL,
    doctor_id        UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    service_title    TEXT NOT NULL,
    customer_name    TEXT NOT NULL,
    customer_email   TEXT NOT NULL,
    customer_phone   TEXT,
    customer_type    TEXT CHECK (customer_type IN ('new', 'returning')) DEFAULT 'new',
    address          TEXT,
    session_count    INTEGER NOT NULL DEFAULT 1,
    unit_price       NUMERIC(10,2) NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_amount     NUMERIC(10,2) NOT NULL,
    status           public.order_status NOT NULL DEFAULT 'pending',
    booking_date     DATE NOT NULL,
    booking_time     TIME NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_review_per_order UNIQUE (order_id)
);

-- ============================================
-- STEP 5: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_doctor   ON public.orders(doctor_id);

CREATE INDEX IF NOT EXISTS idx_services_category_active ON public.services(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subservices_service ON public.subservices(service_id);

CREATE INDEX IF NOT EXISTS idx_categories_locations ON public.categories USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_services_locations   ON public.services   USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_doctors_locations    ON public.doctors    USING GIN (locations);

-- ============================================
-- STEP 6: HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- ============================================
-- STEP 7: AUTH TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, email, first_name, last_name, phone, role
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name',''),'User'),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name',''),''),
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role,'customer')
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 8: UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles','categories','services',
        'subservices','doctors','orders','reviews'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
             CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
            t,t,t,t
        );
    END LOOP;
END $$;

-- ============================================
-- STEP 9: RLS
-- ============================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subservices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews     ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins manage profiles" ON public.profiles
FOR ALL USING (public.is_admin());

-- Categories / Services / Subservices / Doctors
CREATE POLICY "Public read active categories" ON public.categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage categories" ON public.categories
FOR ALL USING (public.is_admin());

CREATE POLICY "Public read active services" ON public.services
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage services" ON public.services
FOR ALL USING (public.is_admin());

CREATE POLICY "Public read subservices" ON public.subservices
FOR SELECT USING (true);

CREATE POLICY "Admins manage subservices" ON public.subservices
FOR ALL USING (public.is_admin());

CREATE POLICY "Public read active doctors" ON public.doctors
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage doctors" ON public.doctors
FOR ALL USING (public.is_admin());

-- Orders
CREATE POLICY "Users manage own orders" ON public.orders
FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Admins manage orders" ON public.orders
FOR ALL USING (public.is_admin());

-- Reviews
CREATE POLICY "Public read reviews" ON public.reviews
FOR SELECT USING (true);

CREATE POLICY "Users manage own reviews" ON public.reviews
FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Admins manage reviews" ON public.reviews
FOR ALL USING (public.is_admin());

-- ============================================
-- STEP 10: STORAGE POLICIES
-- ============================================

CREATE POLICY "Authenticated users upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('category-images','service-images','doctor-images'));

CREATE POLICY "Public read images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('category-images','service-images','doctor-images'));

CREATE POLICY "Users delete own images"
ON storage.objects FOR DELETE TO authenticated
USING ((storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- END OF SCHEMA
-- ============================================
