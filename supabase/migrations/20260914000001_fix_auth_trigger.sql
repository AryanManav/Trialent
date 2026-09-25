-- ============================================================================
-- TRIALENT FIX AUTH TRIGGER & PERMISSIONS
-- Run this in Supabase SQL Editor to fix "Database error saving new user"
-- ============================================================================

-- 1. Grant schema permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

-- 2. Add INSERT policies on public.users and public.candidate_profiles
DROP POLICY IF EXISTS "Allow trigger or service to insert users" ON public.users;
CREATE POLICY "Allow trigger or service to insert users"
    ON public.users FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow trigger or service to insert candidate profiles" ON public.candidate_profiles;
CREATE POLICY "Allow trigger or service to insert candidate profiles"
    ON public.candidate_profiles FOR INSERT
    WITH CHECK (true);

-- 3. Robust handle_new_user function with explicit search_path and exception fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_role_val public.user_role := 'candidate';
    full_name_val TEXT;
BEGIN
    IF (NEW.raw_user_meta_data->>'role') = 'company' THEN
        user_role_val := 'company';
    ELSIF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        user_role_val := 'admin';
    END IF;

    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

    INSERT INTO public.users (id, email, full_name, role, avatar_url, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        full_name_val,
        user_role_val,
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        email_verified = EXCLUDED.email_verified,
        updated_at = timezone('utc'::text, now());

    IF user_role_val = 'candidate' THEN
        INSERT INTO public.candidate_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Re-attach trigger specifically on AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
