-- If you get an error about missing 'subservice_id' in 'orders', run this manually:
-- ALTER TABLE public.orders ADD COLUMN subservice_id UUID REFERENCES public.subservices(id) ON DELETE SET NULL;
-- ============================================
-- SUPABASE SCHEMA - PHONE OTP FIX
-- January 2025 - Fixes "Database error saving new user"
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
        AND tablename IN ('profiles','categories','services','subservices','orders','reviews','doctors')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Storage policies
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
        CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
    END IF;
END $$;

-- ============================================
-- STEP 4: TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    description     TEXT,
    image_url       TEXT,
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    description     TEXT NOT NULL,
    images          JSONB NOT NULL DEFAULT '[]'::jsonb,
    thumbnail       TEXT,
    base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
    session_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_minutes INTEGER,
    is_popular      BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subservices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id  UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    specialization  TEXT,
    bio             TEXT,
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id      UUID REFERENCES public.services(id) ON DELETE SET NULL,
    subservice_id   UUID REFERENCES public.subservices(id) ON DELETE SET NULL,
    doctor_id       UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    service_title   TEXT NOT NULL,
    customer_name   TEXT NOT NULL,
    customer_email  TEXT NOT NULL,
    customer_phone  TEXT,
    address         TEXT,
    session_count   INTEGER NOT NULL DEFAULT 1,
    unit_price      NUMERIC(10,2) NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(10,2) NOT NULL,
    status          public.order_status NOT NULL DEFAULT 'pending',
    booking_date    DATE NOT NULL,
    booking_time    TIME NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower_unique ON public.profiles (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_doctor ON public.orders(doctor_id);

CREATE INDEX IF NOT EXISTS idx_services_category_active ON public.services (category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subservices_service ON public.subservices(service_id);

-- ============================================
-- STEP 6: HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- CRITICAL FIX: Simplified trigger that won't fail
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_email TEXT;
    v_phone TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_role public.user_role;
BEGIN
    -- Extract data with safe defaults
    v_email := COALESCE(
        NEW.email, 
        NEW.raw_user_meta_data->>'email'
    );
    
    v_phone := COALESCE(
        NEW.phone, 
        NEW.raw_user_meta_data->>'phone'
    );
    
    v_first_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
        'User'
    );
    
    v_last_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
        ''
    );
    
    v_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        'customer'
    );

    -- Insert profile with UPSERT to avoid conflicts
    INSERT INTO public.profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_email,
        v_first_name,
        v_last_name,
        v_phone,
        v_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: RE-ENABLE TRIGGER
-- ============================================
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['profiles','categories','services','subservices','doctors','orders','reviews']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
            CREATE TRIGGER trg_%I_updated_at
                BEFORE UPDATE ON public.%I
                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================
-- STEP 8: RLS POLICIES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subservices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" 
    ON public.profiles FOR SELECT 
    USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- Categories
CREATE POLICY "Public read active categories" 
    ON public.categories FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admins full access categories" 
    ON public.categories FOR ALL 
    USING (public.is_admin());

-- Services
CREATE POLICY "Public read active services" 
    ON public.services FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admins full access services" 
    ON public.services FOR ALL 
    USING (public.is_admin());

-- Subservices
CREATE POLICY "Public read all subservices" 
    ON public.subservices FOR SELECT 
    USING (true);

CREATE POLICY "Admins full access subservices" 
    ON public.subservices FOR ALL 
    USING (public.is_admin());

-- Doctors
CREATE POLICY "Public read active doctors" 
    ON public.doctors FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admins full access doctors" 
    ON public.doctors FOR ALL 
    USING (public.is_admin());

-- Orders
CREATE POLICY "Users can see own orders" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own orders" 
    ON public.orders FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own pending orders" 
    ON public.orders FOR UPDATE 
    USING (auth.uid() = customer_id AND status = 'pending');

CREATE POLICY "Admins full access orders" 
    ON public.orders FOR ALL 
    USING (public.is_admin());

-- Reviews
CREATE POLICY "Public read all reviews" 
    ON public.reviews FOR SELECT 
    USING (true);

CREATE POLICY "Users can create own review" 
    ON public.reviews FOR INSERT 
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own review" 
    ON public.reviews FOR UPDATE 
    USING (auth.uid() = customer_id);

CREATE POLICY "Admins full access reviews" 
    ON public.reviews FOR ALL 
    USING (public.is_admin());

-- ============================================
-- STEP 9: STORAGE POLICIES
-- ============================================

CREATE POLICY "Authenticated users can upload to image buckets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('category-images', 'service-images', 'doctor-images'));

CREATE POLICY "Anyone can read image buckets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('category-images', 'service-images', 'doctor-images'));

CREATE POLICY "Users can delete their own uploads"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id IN ('category-images', 'service-images', 'doctor-images')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- VERIFICATION QUERIES (Run these to check)
-- ============================================

-- Check if trigger exists
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check profiles table
-- SELECT * FROM public.profiles LIMIT 5;

-- Test trigger manually (don't run in production!)
-- SELECT public.handle_new_user();

-- ============================================
-- END OF SCHEMA
-- ============================================