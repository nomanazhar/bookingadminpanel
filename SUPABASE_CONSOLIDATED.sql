-- ============================================
-- SUPABASE COMPLETE PRODUCTION SCHEMA
-- Fully idempotent — safe to re-run at any time
-- FEATURES:
--   • Single `locations` table as master list
--   • TEXT[] columns on categories/services/doctors
--   • Multi-service booking: service_ids[], service_titles[]
--   • Sessions track individual service via service_id
--   • Google Calendar event ID on orders
-- ============================================

-- ============================================
-- STEP 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- STEP 2: ENUMS
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('customer','admin','doctor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending','confirmed','completed','cancelled','expired');
    END IF;
END $$;

-- ============================================
-- STEP 3: TABLES
-- (All columns defined here — no duplicate ALTER ADD COLUMN below)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    first_name  TEXT        NOT NULL DEFAULT 'User',
    last_name   TEXT        NOT NULL DEFAULT '',
    role        public.user_role NOT NULL DEFAULT 'customer',
    avatar_url  TEXT,
    phone       TEXT,
    gender      TEXT,
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master list of valid location names.
-- categories/services/doctors store location names as TEXT[].
CREATE TABLE IF NOT EXISTS public.locations (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL UNIQUE,
    address    TEXT,
    city       TEXT,
    country    TEXT        NOT NULL DEFAULT 'UK',
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL,
    slug          TEXT        UNIQUE NOT NULL,
    description   TEXT,
    image_url     TEXT,
    display_order INTEGER     NOT NULL DEFAULT 0,
    locations     TEXT[]      NOT NULL DEFAULT '{}',
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID,
    name             TEXT          NOT NULL,
    slug             TEXT          UNIQUE NOT NULL,
    description      TEXT          NOT NULL,
    images           JSONB         NOT NULL DEFAULT '[]',
    thumbnail        TEXT,
    base_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
    session_options  JSONB         NOT NULL DEFAULT '[]',
    duration_minutes INTEGER,
    locations        TEXT[]        NOT NULL DEFAULT '{}',
    is_popular       BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_services_category
        FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.subservices (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID          NOT NULL,
    name       TEXT          NOT NULL,
    slug       TEXT          NOT NULL,
    price      NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_subservices_service
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.doctors (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name          TEXT        NOT NULL,
    last_name           TEXT        NOT NULL,
    email               TEXT        UNIQUE NOT NULL,
    phone               TEXT,
    specialization      TEXT,
    bio                 TEXT,
    avatar_url          TEXT,
    locations           TEXT[]      NOT NULL DEFAULT '{}',
    allowed_admin_pages TEXT[]      NOT NULL DEFAULT '{}',
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id              UUID          NOT NULL,
    -- Single service (backwards compat)
    service_id               UUID,
    service_title            TEXT          NOT NULL,
    -- Multi-service (new)
    service_ids              UUID[]        NOT NULL DEFAULT '{}',
    service_titles           TEXT[]        NOT NULL DEFAULT '{}',
    subservice_id            UUID,
    doctor_id                UUID,
    customer_name            TEXT          NOT NULL,
    customer_email           TEXT          NOT NULL,
    customer_phone           TEXT,
    customer_type            TEXT          CHECK (customer_type IN ('new','returning')) DEFAULT 'new',
    address                  TEXT,
    session_count            INTEGER       NOT NULL DEFAULT 1,
    unit_price               NUMERIC(10,2) NOT NULL,
    discount_percent         NUMERIC(5,2)  DEFAULT 0,
    total_amount             NUMERIC(10,2) NOT NULL,
    status                   public.order_status NOT NULL DEFAULT 'pending',
    booking_date             DATE          NOT NULL,
    booking_time             TIME          NOT NULL,
    booking_end_time         TIME,
    notes                    TEXT,
    google_calendar_event_id TEXT,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)   REFERENCES public.profiles(id)    ON DELETE CASCADE,
    CONSTRAINT fk_orders_service
        FOREIGN KEY (service_id)    REFERENCES public.services(id)    ON DELETE SET NULL,
    CONSTRAINT fk_orders_subservice
        FOREIGN KEY (subservice_id) REFERENCES public.subservices(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_doctor
        FOREIGN KEY (doctor_id)     REFERENCES public.doctors(id)     ON DELETE SET NULL
);

-- ADD COLUMN IF NOT EXISTS for existing DBs that have the old schema
-- These are no-ops on a fresh install since columns are in CREATE TABLE above
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_ids              UUID[]  NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_titles           TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

CREATE TABLE IF NOT EXISTS public.sessions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID        NOT NULL,
    -- Tracks which service this session belongs to (for multi-service bookings)
    service_id     UUID,
    session_number INTEGER     NOT NULL,
    scheduled_date DATE,
    scheduled_time TIME,
    status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','scheduled','completed','missed','cancelled','expired')),
    attended_date  DATE,
    attended_time  TIME,
    notes          TEXT,
    expires_at     DATE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_sessions_order
        FOREIGN KEY (order_id)   REFERENCES public.orders(id)   ON DELETE CASCADE
);

-- For existing DBs: add service_id column to sessions if missing
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS service_id UUID;

-- For existing DBs: add attended_time column to sessions if missing
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS attended_time TIME;

-- Add FK constraint on sessions.service_id only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_sessions_service'
          AND conrelid = 'public.sessions'::regclass
    ) THEN
        ALTER TABLE public.sessions
            ADD CONSTRAINT fk_sessions_service
            FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reviews (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID        NOT NULL,
    service_id  UUID        NOT NULL,
    order_id    UUID        NOT NULL,
    rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    is_featured BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_reviews_customer
        FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_service
        FOREIGN KEY (service_id)  REFERENCES public.services(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id)    REFERENCES public.orders(id)   ON DELETE CASCADE,
    CONSTRAINT unique_review_per_order UNIQUE (order_id)
);

-- ============================================
-- STEP 4: DATA MIGRATION
-- Populate service_ids from service_id for existing single-service orders.
-- Runs only when service_ids is empty and service_id exists — idempotent.
-- ============================================

UPDATE public.orders
SET
    service_ids    = ARRAY[service_id],
    service_titles = ARRAY[service_title]
WHERE
    service_id IS NOT NULL
    AND (service_ids IS NULL OR service_ids = '{}');

-- ============================================
-- STEP 5: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subservices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews     ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: ADMIN HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- ============================================
-- STEP 7: RLS POLICIES
-- ============================================

-- profiles
DROP POLICY IF EXISTS "Users read own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile"         ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all updates for debugging"  ON public.profiles;

CREATE POLICY "Users read own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles"
    ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Service role can update profiles"
    ON public.profiles FOR UPDATE TO service_role USING (true);

-- locations
DROP POLICY IF EXISTS "Public read locations"   ON public.locations;
DROP POLICY IF EXISTS "Admins manage locations" ON public.locations;
CREATE POLICY "Public read locations"
    ON public.locations FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage locations"
    ON public.locations FOR ALL USING (public.is_admin());

-- categories
DROP POLICY IF EXISTS "Public read categories"   ON public.categories;
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Public read categories"
    ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage categories"
    ON public.categories FOR ALL USING (public.is_admin());

-- services
DROP POLICY IF EXISTS "Public read services"   ON public.services;
DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Public read services"
    ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage services"
    ON public.services FOR ALL USING (public.is_admin());

-- subservices
DROP POLICY IF EXISTS "Public read subservices"   ON public.subservices;
DROP POLICY IF EXISTS "Admins manage subservices" ON public.subservices;
CREATE POLICY "Public read subservices"
    ON public.subservices FOR SELECT USING (true);
CREATE POLICY "Admins manage subservices"
    ON public.subservices FOR ALL USING (public.is_admin());

-- doctors
DROP POLICY IF EXISTS "Public read doctors"   ON public.doctors;
DROP POLICY IF EXISTS "Admins manage doctors" ON public.doctors;
CREATE POLICY "Public read doctors"
    ON public.doctors FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage doctors"
    ON public.doctors FOR ALL USING (public.is_admin());

-- orders
DROP POLICY IF EXISTS "Users manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage orders"    ON public.orders;
CREATE POLICY "Users manage own orders"
    ON public.orders FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Admins manage orders"
    ON public.orders FOR ALL USING (public.is_admin());

-- sessions
DROP POLICY IF EXISTS "Users manage own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Admins manage sessions"    ON public.sessions;
CREATE POLICY "Users manage own sessions"
    ON public.sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = sessions.order_id
              AND orders.customer_id = auth.uid()
        )
    );
CREATE POLICY "Admins manage sessions"
    ON public.sessions FOR ALL USING (public.is_admin());

-- reviews
DROP POLICY IF EXISTS "Public read reviews"      ON public.reviews;
DROP POLICY IF EXISTS "Users manage own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins manage reviews"    ON public.reviews;
CREATE POLICY "Public read reviews"
    ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users manage own reviews"
    ON public.reviews FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Admins manage reviews"
    ON public.reviews FOR ALL USING (public.is_admin());

-- ============================================
-- STEP 8: USER CREATION TRIGGER
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
    IF incoming_role NOT IN ('customer','admin','doctor') THEN
        incoming_role := 'customer';
    END IF;
    INSERT INTO public.profiles (id, email, first_name, last_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name',''), 'User'),
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
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 9: UPDATED_AT TRIGGERS (all tables)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at    ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at   ON public.locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at  ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at    ON public.services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subservices_updated_at ON public.subservices;
CREATE TRIGGER update_subservices_updated_at
    BEFORE UPDATE ON public.subservices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_doctors_updated_at     ON public.doctors;
CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at      ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at    ON public.sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at     ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 10: ORDERS WITH SESSIONS VIEW
-- ============================================

DROP VIEW IF EXISTS public.orders_with_sessions;

CREATE OR REPLACE VIEW public.orders_with_sessions
WITH (security_invoker = true) AS
SELECT
    o.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id',             s.id,
                'session_number', s.session_number,
                'service_id',     s.service_id,
                'status',         s.status,
                'scheduled_date', s.scheduled_date,
                'scheduled_time', s.scheduled_time
            )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
    ) AS sessions
FROM public.orders   o
LEFT JOIN public.sessions s ON s.order_id = o.id
GROUP BY o.id;

GRANT SELECT ON public.orders_with_sessions TO anon, authenticated;

-- ============================================
-- STEP 11: DASHBOARD MATERIALIZED VIEW
-- DROP CONCURRENTLY not needed — IF NOT EXISTS + DROP handles schema sync.
-- Using DO block to safely recreate only when columns are out of sync.
-- ============================================

DO $$
BEGIN
    -- Drop and recreate if total_locations column is missing (schema sync)
    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'public.dashboard_stats'::regclass
          AND attname   = 'total_locations'
          AND attnum    > 0
    ) THEN
        DROP MATERIALIZED VIEW IF EXISTS public.dashboard_stats CASCADE;
    END IF;
EXCEPTION WHEN undefined_table THEN
    NULL; -- view doesn't exist yet, that's fine
END $$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM public.profiles  WHERE role = 'customer') AS total_customers,
    (SELECT COUNT(*) FROM public.orders)                             AS total_orders,
    (SELECT COUNT(*) FROM public.categories WHERE is_active = true) AS total_categories,
    (SELECT COUNT(*) FROM public.services   WHERE is_active = true) AS total_services,
    (SELECT COUNT(*) FROM public.doctors    WHERE is_active = true) AS total_doctors,
    (SELECT COUNT(*) FROM public.locations  WHERE is_active = true) AS total_locations,
    (SELECT COUNT(*) FROM public.orders
        WHERE status IN ('pending','confirmed')
          AND (
            booking_date > CURRENT_DATE
            OR (booking_date = CURRENT_DATE AND booking_time >= (CURRENT_TIMESTAMP)::time)
          )
    ) AS future_appointments,
    NOW() AS last_refreshed;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_unique
    ON public.dashboard_stats((1));

-- ============================================
-- STEP 12: REFRESH FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_dashboard_stats() TO service_role;

-- ============================================
-- STEP 13: GET DASHBOARD DATA RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_limit integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_customers     bigint := 0;
    v_total_orders        bigint := 0;
    v_total_categories    bigint := 0;
    v_total_services      bigint := 0;
    v_total_doctors       bigint := 0;
    v_total_locations     bigint := 0;
    v_future_appointments bigint := 0;
    v_recent_orders       jsonb  := '[]'::jsonb;
BEGIN
    SELECT
        total_customers, total_orders, total_categories,
        total_services,  total_doctors, total_locations, future_appointments
    INTO
        v_total_customers, v_total_orders, v_total_categories,
        v_total_services,  v_total_doctors, v_total_locations, v_future_appointments
    FROM public.dashboard_stats
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT COUNT(*) INTO v_total_customers  FROM public.profiles    WHERE role = 'customer';
        SELECT COUNT(*) INTO v_total_orders     FROM public.orders;
        SELECT COUNT(*) INTO v_total_categories FROM public.categories  WHERE is_active = true;
        SELECT COUNT(*) INTO v_total_services   FROM public.services    WHERE is_active = true;
        SELECT COUNT(*) INTO v_total_doctors    FROM public.doctors     WHERE is_active = true;
        SELECT COUNT(*) INTO v_total_locations  FROM public.locations   WHERE is_active = true;
        SELECT COUNT(*) INTO v_future_appointments
        FROM public.orders
        WHERE status IN ('pending','confirmed')
          AND (
            booking_date > CURRENT_DATE
            OR (booking_date = CURRENT_DATE AND booking_time >= (CURRENT_TIMESTAMP)::time)
          );
    END IF;

    SELECT COALESCE(jsonb_agg(o), '[]'::jsonb) INTO v_recent_orders
    FROM (
        SELECT
            o.*,
            row_to_json(svc.*)  AS service,
            row_to_json(cat.*)  AS category,
            row_to_json(cust.*) AS customer,
            row_to_json(doc.*)  AS doctor
        FROM public.orders      o
        LEFT JOIN public.services    svc  ON svc.id  = o.service_id
        LEFT JOIN public.categories  cat  ON cat.id  = svc.category_id
        LEFT JOIN public.profiles    cust ON cust.id = o.customer_id
        LEFT JOIN public.doctors     doc  ON doc.id  = o.doctor_id
        ORDER BY o.created_at DESC
        LIMIT p_limit
    ) o;

    RETURN jsonb_build_object(
        'stats', jsonb_build_object(
            'totalCustomers',  v_total_customers,
            'totalOrders',     v_total_orders,
            'totalCategories', v_total_categories,
            'totalServices',   v_total_services,
            'totalDoctors',    v_total_doctors,
            'totalLocations',  v_total_locations
        ),
        'futureAppointments', v_future_appointments,
        'recentOrders',       v_recent_orders
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data(integer) TO service_role;

-- ============================================
-- STEP 14: CUSTOMER ORDER CREATION RPC
-- Supports both single-service (backwards compat) and multi-service
-- ============================================

CREATE OR REPLACE FUNCTION public.create_customer_order_with_sessions(
    p_service_id        uuid,
    p_booking_date      text,
    p_booking_time      text,
    p_subservice_id     uuid    DEFAULT NULL,
    p_doctor_id         uuid    DEFAULT NULL,
    p_package           text    DEFAULT NULL,
    p_sessions          integer DEFAULT NULL,
    p_session_count     integer DEFAULT NULL,
    p_unit_price        numeric DEFAULT NULL,
    p_discount_percent  numeric DEFAULT NULL,
    p_total_amount      numeric DEFAULT NULL,
    p_customer_phone    text    DEFAULT NULL,
    p_address           text    DEFAULT NULL,
    p_notes             text    DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id      uuid;
    v_profile          public.profiles%ROWTYPE;
    v_service          record;
    v_session_count    integer;
    v_base_price       numeric := 0;
    v_discount_percent numeric := 0;
    v_unit_price       numeric := 0;
    v_total_amount     numeric := 0;
    v_date             date;
    v_time             time;
    v_booking_end_time time;
    v_order            public.orders;
BEGIN
    v_customer_id := auth.uid();
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles WHERE id = v_customer_id;

    SELECT base_price, duration_minutes, name INTO v_service
    FROM public.services
    WHERE id = p_service_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found';
    END IF;

    v_base_price    := COALESCE(v_service.base_price, 0);
    v_session_count := GREATEST(1, LEAST(10, COALESCE(p_sessions, p_session_count, 1)));

    IF p_discount_percent IS NOT NULL THEN
        v_discount_percent := p_discount_percent;
    ELSIF v_session_count = 3  THEN v_discount_percent := 20;
    ELSIF v_session_count = 6  THEN v_discount_percent := 30;
    ELSIF v_session_count = 10 THEN v_discount_percent := 40;
    ELSE                            v_discount_percent := 0;
    END IF;

    v_unit_price   := COALESCE(p_unit_price,   ROUND(v_base_price * (1 - v_discount_percent / 100.0), 2));
    v_total_amount := COALESCE(p_total_amount, v_unit_price * v_session_count);

    BEGIN
        v_date := p_booking_date::date;
        v_time := p_booking_time::time;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid booking date or time';
    END;

    IF v_service.duration_minutes IS NOT NULL THEN
        v_booking_end_time :=
            ((v_date::text || ' ' || v_time::text)::timestamptz
              + (v_service.duration_minutes || ' minutes')::interval
            )::time;
    END IF;

    INSERT INTO public.orders (
        customer_id, service_id, service_ids, service_title, service_titles,
        subservice_id, doctor_id,
        customer_name, customer_email, customer_phone,
        customer_type, address, session_count, unit_price,
        discount_percent, total_amount, status,
        booking_date, booking_time, booking_end_time, notes
    )
    VALUES (
        v_customer_id,
        p_service_id,
        ARRAY[p_service_id],
        COALESCE(p_package, v_service.name),
        ARRAY[COALESCE(p_package, v_service.name)],
        p_subservice_id, p_doctor_id,
        TRIM(COALESCE(v_profile.first_name,'') || ' ' || COALESCE(v_profile.last_name,'')),
        COALESCE(v_profile.email,''),
        p_customer_phone, 'returning', p_address,
        v_session_count, v_unit_price,
        ROUND(v_discount_percent, 0), v_total_amount, 'pending',
        v_date, v_time, v_booking_end_time, p_notes
    )
    RETURNING * INTO v_order;

    IF v_order.id IS NOT NULL AND v_session_count > 0 THEN
        INSERT INTO public.sessions (
            order_id, service_id, session_number, status,
            scheduled_date, scheduled_time, expires_at
        )
        SELECT
            v_order.id,
            p_service_id,       -- each session links to the service
            i,
            CASE WHEN i = 1 THEN 'scheduled' ELSE 'pending' END,
            CASE WHEN i = 1 THEN v_order.booking_date ELSE NULL END,
            CASE WHEN i = 1 THEN v_order.booking_time ELSE NULL END,
            NULL
        FROM generate_series(1, v_session_count) AS s(i);
    END IF;

    RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_order_with_sessions(
    uuid, text, text, uuid, uuid, text, integer, integer, numeric, numeric, numeric, text, text, text
) TO authenticated;

-- ============================================
-- STEP 15: PERFORMANCE INDEXES
-- ============================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role                      ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email                     ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at                ON public.profiles(created_at DESC);

-- locations
CREATE INDEX IF NOT EXISTS idx_locations_is_active                ON public.locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_name                     ON public.locations(name);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_is_active_display_order ON public.categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_slug                    ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_locations               ON public.categories USING GIN(locations);

-- services
CREATE INDEX IF NOT EXISTS idx_services_category_id               ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active_created_at      ON public.services(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_is_popular_is_active      ON public.services(is_popular, is_active);
CREATE INDEX IF NOT EXISTS idx_services_slug                      ON public.services(slug);
CREATE INDEX IF NOT EXISTS idx_services_locations                 ON public.services USING GIN(locations);

-- doctors
CREATE INDEX IF NOT EXISTS idx_doctors_is_active                  ON public.doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_doctors_email                      ON public.doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_locations                  ON public.doctors USING GIN(locations);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_id                 ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_doctor_id                   ON public.orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_id                  ON public.orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_ids                 ON public.orders USING GIN(service_ids);
CREATE INDEX IF NOT EXISTS idx_orders_service_titles              ON public.orders USING GIN(service_titles);
CREATE INDEX IF NOT EXISTS idx_orders_status                      ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_booking_date_time           ON public.orders(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_orders_created_at                  ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_date_time    ON public.orders(customer_email, booking_date, booking_time);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_order_id                  ON public.sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_sessions_order_id_session_number   ON public.sessions(order_id, session_number);
CREATE INDEX IF NOT EXISTS idx_sessions_service_id                ON public.sessions(service_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status                    ON public.sessions(status);

-- ============================================
-- STEP 16: PG_CRON SCHEDULE
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'refresh_dashboard_stats_5min'
    ) THEN
        PERFORM cron.schedule(
            'refresh_dashboard_stats_5min',
            '*/5 * * * *',
            'SELECT public.refresh_dashboard_stats();'
        );
    END IF;
END $$;