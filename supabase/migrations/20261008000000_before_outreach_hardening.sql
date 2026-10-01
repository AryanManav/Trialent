-- Before-outreach hardening (audit 2026-09-25, SEC-01 to SEC-10, plus two
-- insert holes found while writing it).
--
-- The Supabase URL and publishable key ship to every browser, so any signed-in
-- user can call PostgREST directly and skip the server actions. RLS and
-- triggers are the real boundary; this closes the places where they were
-- looser than the app's own checks.
--
-- Column guards are BEFORE triggers named aaa_* so they fire first (Postgres
-- fires same-event triggers in name order) and see exactly the row the caller
-- sent. They only restrict end-user sessions, the same rule as
-- protect_user_account_fields: they step aside for
--   * the service role / SQL editor        (auth.role() not anon/authenticated)
--   * admins                               (public.is_admin())
--   * writes made by other triggers        (pg_trigger_depth() > 1)
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on the original SECURITY DEFINER helpers (SEC-09)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_company_member(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_current_candidate_id() SET search_path = public, pg_temp;

-- True when the request comes from an end-user session that isn't an admin
-- and isn't a nested trigger write: the only writer the guards restrict.
CREATE OR REPLACE FUNCTION public.is_restricted_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT coalesce(auth.role(), '') IN ('anon', 'authenticated')
        AND pg_trigger_depth() <= 1
        AND NOT public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(lookup_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = lookup_company_id
          AND user_id = auth.uid()
          AND role = 'owner'
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Feedback and outcomes only for the company's own selected candidate
--    (SEC-01, SEC-02). Mirrors isSelectedCandidate in lib/data/evaluation.ts.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Company members can submit feedback" ON public.project_feedback;
CREATE POLICY "Company members can submit feedback"
    ON public.project_feedback FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            reviewer_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = project_feedback.project_id
                  AND p.company_id = project_feedback.company_id
                  AND public.is_company_member(p.company_id)
            )
            AND EXISTS (
                SELECT 1 FROM public.project_selections ps
                WHERE ps.project_id = project_feedback.project_id
                  AND ps.candidate_id = project_feedback.candidate_id
            )
        )
    );

DROP POLICY IF EXISTS "Company members can record outcome" ON public.project_outcomes;
CREATE POLICY "Company members can record outcome"
    ON public.project_outcomes FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            EXISTS (
                SELECT 1 FROM public.projects p
                WHERE p.id = project_outcomes.project_id
                  AND public.is_company_member(p.company_id)
            )
            AND EXISTS (
                SELECT 1 FROM public.project_selections ps
                WHERE ps.project_id = project_outcomes.project_id
                  AND ps.candidate_id = project_outcomes.candidate_id
            )
        )
    );

-- ---------------------------------------------------------------------------
-- 3. Companies: no self-granted "verified", no orphan inserts (SEC-03)
-- ---------------------------------------------------------------------------
-- create_company_with_owner is the only way to create a company; the open
-- policy let anyone insert one directly, verified = true included.
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

DROP POLICY IF EXISTS "Company members can update company" ON public.companies;
CREATE POLICY "Company members can update company"
    ON public.companies FOR UPDATE TO authenticated
    USING (public.is_company_member(id) OR public.is_admin())
    WITH CHECK (public.is_company_member(id) OR public.is_admin());

CREATE OR REPLACE FUNCTION public.guard_company_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF public.is_restricted_writer()
        AND (NEW.verified IS DISTINCT FROM OLD.verified OR NEW.id IS DISTINCT FROM OLD.id) THEN
        RAISE EXCEPTION 'Only Trialent can change a company''s verification'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_guard_company_fields ON public.companies;
CREATE TRIGGER aaa_guard_company_fields
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.guard_company_fields();

-- Only company accounts (or admins) may create a company (SEC-10).
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
    company_name text,
    company_website text DEFAULT NULL,
    company_description text DEFAULT NULL,
    company_industry text DEFAULT NULL,
    company_size text DEFAULT NULL,
    company_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id uuid := auth.uid();
    new_company_id uuid;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = caller_id AND role IN ('company', 'admin')
    ) THEN
        RAISE EXCEPTION 'Only company accounts can create a company'
            USING ERRCODE = '42501';
    END IF;

    IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id = caller_id) THEN
        RAISE EXCEPTION 'User already belongs to a company';
    END IF;

    IF company_name IS NULL OR length(trim(company_name)) < 2 THEN
        RAISE EXCEPTION 'Company name is required';
    END IF;

    INSERT INTO public.companies (
        name, website, description, industry, company_size, location
    )
    VALUES (
        trim(company_name),
        company_website,
        company_description,
        company_industry,
        company_size,
        company_location
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (new_company_id, caller_id, 'owner');

    RETURN new_company_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Company members: owners manage the team, nobody removes the last owner
--    (SEC-04). The app never writes this table; create_company_with_owner does.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Company members manage members" ON public.company_members;
DROP POLICY IF EXISTS "Owners add members" ON public.company_members;
DROP POLICY IF EXISTS "Owners change members" ON public.company_members;
DROP POLICY IF EXISTS "Owners remove members, anyone leaves" ON public.company_members;

CREATE POLICY "Owners add members"
    ON public.company_members FOR INSERT TO authenticated
    WITH CHECK (public.is_company_owner(company_id) OR public.is_admin());

CREATE POLICY "Owners change members"
    ON public.company_members FOR UPDATE TO authenticated
    USING (public.is_company_owner(company_id) OR public.is_admin())
    WITH CHECK (public.is_company_owner(company_id) OR public.is_admin());

CREATE POLICY "Owners remove members, anyone leaves"
    ON public.company_members FOR DELETE TO authenticated
    USING (
        public.is_company_owner(company_id)
        OR user_id = auth.uid()
        OR public.is_admin()
    );

CREATE OR REPLACE FUNCTION public.guard_company_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Account deletion cascades here through foreign keys (nested triggers).
    IF NOT public.is_restricted_writer() THEN
        RETURN coalesce(NEW, OLD);
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.company_id IS DISTINCT FROM OLD.company_id
            OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'A membership can''t be moved to another company or person'
                USING ERRCODE = '42501';
        END IF;
        -- Staying an owner never removes an owner.
        IF NEW.role = 'owner' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Here: a delete, or an update that demotes. Refuse if OLD was the last owner.
    IF OLD.role = 'owner'
        AND NOT EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_id = OLD.company_id
              AND role = 'owner'
              AND id <> OLD.id
        ) THEN
        RAISE EXCEPTION 'A company must keep at least one owner'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS aaa_guard_company_members ON public.company_members;
CREATE TRIGGER aaa_guard_company_members
    BEFORE UPDATE OR DELETE ON public.company_members
    FOR EACH ROW EXECUTE FUNCTION public.guard_company_members();

-- ---------------------------------------------------------------------------
-- 5. Column guards: end users may change only what the app changes
--    (SEC-05, SEC-06), and new rows must start in their initial state.
-- ---------------------------------------------------------------------------

-- Applications: a company decides (status + note). A candidate's insert can't
-- arrive already selected — nothing stopped that before.
CREATE OR REPLACE FUNCTION public.guard_application_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    writable text[] := ARRAY['status', 'decision_note', 'updated_at'];
BEGIN
    IF NOT public.is_restricted_writer() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status IS DISTINCT FROM 'submitted' OR NEW.decision_note IS NOT NULL THEN
            RAISE EXCEPTION 'A new application starts as submitted'
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    IF (to_jsonb(NEW) - writable) IS DISTINCT FROM (to_jsonb(OLD) - writable) THEN
        RAISE EXCEPTION 'Only an application''s status and decision note can be changed'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_guard_application_columns ON public.applications;
CREATE TRIGGER aaa_guard_application_columns
    BEFORE INSERT OR UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.guard_application_columns();

-- Submissions: a company reviews (status, note, reopen choice). A candidate's
-- insert can't arrive already accepted — that would forge verified work.
CREATE OR REPLACE FUNCTION public.guard_submission_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    writable text[] := ARRAY['status', 'review_note', 'reopen_project'];
BEGIN
    IF NOT public.is_restricted_writer() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status IS DISTINCT FROM 'submitted'
            OR NEW.review_note IS NOT NULL
            OR NEW.reopen_project IS NOT NULL
            OR NEW.reviewed_at IS NOT NULL THEN
            RAISE EXCEPTION 'New work starts as submitted'
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    IF (to_jsonb(NEW) - writable) IS DISTINCT FROM (to_jsonb(OLD) - writable) THEN
        RAISE EXCEPTION 'Submitted work can''t be edited, only reviewed'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_guard_submission_columns ON public.project_submissions;
CREATE TRIGGER aaa_guard_submission_columns
    BEFORE INSERT OR UPDATE ON public.project_submissions
    FOR EACH ROW EXECUTE FUNCTION public.guard_submission_columns();

-- Projects: once posted, the brief, fee and deadlines are what candidates
-- applied to. Companies may only change visibility/status (itself guarded by
-- guard_project_status) and the withdrawal reason. There is no edit screen.
CREATE OR REPLACE FUNCTION public.guard_project_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    writable text[] := ARRAY['status', 'withdrawal_reason', 'updated_at'];
BEGIN
    IF NOT public.is_restricted_writer() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status NOT IN ('draft', 'applications_open') OR NEW.closed_at IS NOT NULL THEN
            RAISE EXCEPTION 'A new project starts as a draft or open for applications'
                USING ERRCODE = '42501';
        END IF;
        -- Unpaid assessments are capped (MAX_ASSESSMENT_HOURS in lib/constants).
        IF NEW.opportunity_type = 'hire' AND NEW.expected_hours > 8 THEN
            RAISE EXCEPTION 'Keep the assessment to 8 hours or less'
                USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
    END IF;

    IF (to_jsonb(NEW) - writable) IS DISTINCT FROM (to_jsonb(OLD) - writable) THEN
        RAISE EXCEPTION 'A posted project''s brief, fee and deadlines can''t be changed'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_guard_project_columns ON public.projects;
CREATE TRIGGER aaa_guard_project_columns
    BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.guard_project_columns();

-- ---------------------------------------------------------------------------
-- 6. Drop policies that were open to anyone (SEC-07, SEC-08)
-- ---------------------------------------------------------------------------
-- handle_new_user is SECURITY DEFINER and the signup backfill uses the service
-- role; neither needs these. "Candidates can insert own profile" remains.
DROP POLICY IF EXISTS "Allow trigger or service to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow trigger or service to insert candidate profiles" ON public.candidate_profiles;

-- Payments have no write path yet (pilots settle directly, company → candidate).
DROP POLICY IF EXISTS "Company can initiate payment" ON public.payments;

-- ---------------------------------------------------------------------------
-- 7. Terms acceptance (LEGAL-02)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Records the version and the server's time; keeps the first acceptance of a
-- version, so repeat sign-ins change nothing.
CREATE OR REPLACE FUNCTION public.accept_terms(accepted_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
    END IF;
    IF accepted_version IS NULL OR accepted_version !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Invalid terms version' USING ERRCODE = '22023';
    END IF;

    PERFORM set_config('trialent.accepting_terms', 'on', true);
    UPDATE public.users
    SET terms_version = accepted_version, terms_accepted_at = now()
    WHERE id = auth.uid()
      AND terms_version IS DISTINCT FROM accepted_version;
    PERFORM set_config('trialent.accepting_terms', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_terms(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_terms(text) TO authenticated;

-- Users may edit their own row, but not their consent record.
CREATE OR REPLACE FUNCTION public.protect_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF coalesce(auth.role(), '') IN ('anon', 'authenticated')
        AND coalesce(current_setting('trialent.accepting_terms', true), '') <> 'on'
        AND (NEW.terms_version IS DISTINCT FROM OLD.terms_version
             OR NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at) THEN
        RAISE EXCEPTION 'Terms acceptance is recorded by accept_terms only'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_terms_acceptance ON public.users;
CREATE TRIGGER protect_terms_acceptance
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.protect_terms_acceptance();
