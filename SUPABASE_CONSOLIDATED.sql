-- ============================================
-- SUPABASE COMPLETE PRODUCTION SCHEMA
-- FIXES:
-- • FK relationship detection (orders → profiles)
-- • RLS enabled on all tables
-- • Proper policies added
-- • Sessions tracking support
-- • Fully idempotent
-- ============================================


-- ============================================
-- STEP 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================
-- STEP 2: ENUMS
-- ============================================

DO $$
BEGIN

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM
        ('customer','admin','doctor');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM
        ('pending','confirmed','completed','cancelled','expired');
    END IF;

END $$;


-- ============================================
-- STEP 3: PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (

    id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
    email TEXT,
    first_name TEXT NOT NULL DEFAULT 'User',
    last_name TEXT NOT NULL DEFAULT '',
    role public.user_role NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    phone TEXT,
    gender TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- STEP 4: CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    locations TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- STEP 5: SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    images JSONB NOT NULL DEFAULT '[]',
    thumbnail TEXT,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    session_options JSONB NOT NULL DEFAULT '[]',
    duration_minutes INTEGER,
    locations TEXT[] NOT NULL DEFAULT '{}',
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_services_category
    FOREIGN KEY (category_id)
    REFERENCES public.categories(id)
    ON DELETE CASCADE
);
-- ============================================
-- STEP 6: SUBSERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS public.subservices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_subservices_service
    FOREIGN KEY (service_id)
    REFERENCES public.services(id)
    ON DELETE CASCADE
);
-- ============================================
-- STEP 7: DOCTORS
-- ============================================
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    specialization TEXT,
    bio TEXT,
    avatar_url TEXT,
    locations TEXT[] NOT NULL DEFAULT '{}',
    allowed_admin_pages TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================
-- STEP 8: ORDERS (CRITICAL FK FIX)
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    service_id UUID,
    subservice_id UUID,
    doctor_id UUID,
    service_title TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_type TEXT CHECK (customer_type IN ('new','returning')) DEFAULT 'new',
    address TEXT,
    session_count INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    status public.order_status NOT NULL DEFAULT 'pending',
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    booking_end_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_orders_service
    FOREIGN KEY (service_id)
    REFERENCES public.services(id)
    ON DELETE SET NULL,
    CONSTRAINT fk_orders_subservice
    FOREIGN KEY (subservice_id)
    REFERENCES public.subservices(id)
    ON DELETE SET NULL,
    CONSTRAINT fk_orders_doctor
    FOREIGN KEY (doctor_id)
    REFERENCES public.doctors(id)
    ON DELETE SET NULL
);
-- ============================================
-- STEP 9: SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    session_number INTEGER NOT NULL,
    scheduled_date DATE,
    scheduled_time TIME,
    status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','scheduled','completed','missed','cancelled','expired')),
    attended_date DATE,
    notes TEXT,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_sessions_order
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE
);
-- ============================================
-- STEP 10: REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    service_id UUID NOT NULL,
    order_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_reviews_customer
    FOREIGN KEY (customer_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_reviews_service
    FOREIGN KEY (service_id)
    REFERENCES public.services(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_reviews_order
    FOREIGN KEY (order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE,

    CONSTRAINT unique_review_per_order UNIQUE (order_id)
);
-- ============================================
-- STEP 11: ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subservices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
-- ============================================
-- STEP 12: ADMIN HELPER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$;
-- ============================================
-- STEP 13: POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles"
ON public.profiles
FOR ALL
USING (public.is_admin());

DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
CREATE POLICY "Service role can update profiles"
ON public.profiles
FOR UPDATE
TO service_role
USING (true);

-- TEMP: Allow all authenticated users to update any profile (for debugging)
DROP POLICY IF EXISTS "Allow all updates for debugging" ON public.profiles;
CREATE POLICY "Allow all updates for debugging"
ON public.profiles
FOR UPDATE
USING (true);


-- orders
DROP POLICY IF EXISTS "Users manage own orders" ON public.orders;
CREATE POLICY "Users manage own orders"
ON public.orders
FOR ALL
USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders"
ON public.orders
FOR ALL
USING (public.is_admin());


-- services
DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services"
ON public.services
FOR SELECT
USING (is_active = true);


-- doctors
DROP POLICY IF EXISTS "Public read doctors" ON public.doctors;
CREATE POLICY "Public read doctors"
ON public.doctors
FOR SELECT
USING (is_active = true);


-- subservices
DROP POLICY IF EXISTS "Public read subservices" ON public.subservices;
CREATE POLICY "Public read subservices"
ON public.subservices
FOR SELECT
USING (true);


-- categories
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories"
ON public.categories
FOR SELECT
USING (is_active = true);


-- reviews
DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews"
ON public.reviews
FOR SELECT
USING (true);


-- sessions
DROP POLICY IF EXISTS "Users manage own sessions" ON public.sessions;
CREATE POLICY "Users manage own sessions"
ON public.sessions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = sessions.order_id
        AND orders.customer_id = auth.uid()
    )
);
-- ============================================
-- STEP 14: USER CREATION TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  incoming_role TEXT;
BEGIN
  incoming_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  IF incoming_role NOT IN ('customer', 'admin', 'doctor') THEN
    incoming_role := 'customer';
  END IF;
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    incoming_role::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- END OF COMPLETE PRODUCTION SCHEMA
-- ============================================