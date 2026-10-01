-- FREELANCE: a third kind of opportunity, next to BUILD ONLY and HIRE ONLY.
--
-- A company posts a paid freelance contract, selects one freelancer, and the
-- work is delivered and approved milestone by milestone. Two pricing models:
--   fixed   the company lists milestones (title, amount, due date) when it
--           posts; payment_amount is their total.
--   hourly  an hourly rate, hours a week and a duration; the freelancer logs
--           hours each week and each log is approved like a milestone.
--           payment_amount is the estimated total (rate × hours × weeks).
--
-- Trialent never holds money. The company pays the freelancer directly; the
-- platform records the agreed amounts, approvals, "paid" and the freelancer's
-- confirmation that the money arrived — observable evidence, like the rest.
--
-- Selection reuses the build path unchanged (apply_application_decision only
-- special-cases 'hire'): one freelancer, a project_selections row, and project
-- status following it through refresh_project_progress.
--
-- Milestone rows are readable by the company and the selected freelancer.
-- After posting, every change goes through the SECURITY DEFINER functions
-- below (no UPDATE/DELETE policies), the same pattern as save_assessment.
--
-- Run after 20261008000000_before_outreach_hardening.sql. Safe to re-run.

-- 1. Projects: the type and its terms ------------------------------------------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pricing_model TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS hourly_rate INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS hours_per_week INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS duration_weeks INTEGER;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_opportunity_type_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_opportunity_type_check
    CHECK (opportunity_type IN ('build', 'hire', 'freelance'));

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_openings_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_openings_check
    CHECK (
        (opportunity_type = 'hire' AND openings BETWEEN 1 AND 100)
        OR (opportunity_type = 'build' AND openings BETWEEN 1 AND 10
            AND (purpose = 'hire' OR openings = 1))
        OR (opportunity_type = 'freelance' AND openings = 1)
    );

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_hire_capacity_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_hire_capacity_check
    CHECK (
        opportunity_type <> 'hire'
        OR (max_applicants IS NOT NULL AND max_applicants >= openings)
    );

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_freelance_terms_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_freelance_terms_check
    CHECK (
        (opportunity_type <> 'freelance' AND pricing_model IS NULL)
        OR (opportunity_type = 'freelance' AND pricing_model = 'fixed')
        OR (opportunity_type = 'freelance' AND pricing_model = 'hourly'
            AND hourly_rate BETWEEN 100 AND 100000
            AND hours_per_week BETWEEN 1 AND 60
            AND duration_weeks BETWEEN 1 AND 52)
    );

CREATE OR REPLACE FUNCTION public.normalize_opportunity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.opportunity_type IS DISTINCT FROM OLD.opportunity_type THEN
            RAISE EXCEPTION 'An opportunity''s type can''t be changed after it is posted.'
                USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.opportunity_type IN ('build', 'freelance') THEN
        -- One selected person does paid work.
        NEW.purpose := 'build';
        NEW.openings := 1;
        NEW.assessment_title := NULL;
        NEW.assessment_type := NULL;
        NEW.assessment_description := NULL;
        NEW.assessment_requirements := '{}';
        NEW.assessment_technologies := '{}';

        IF NEW.opportunity_type = 'build' THEN
            NEW.pricing_model := NULL;
            NEW.hourly_rate := NULL;
            NEW.hours_per_week := NULL;
            NEW.duration_weeks := NULL;
        ELSIF NEW.pricing_model = 'hourly' THEN
            NEW.payment_amount := NEW.hourly_rate * NEW.hours_per_week * NEW.duration_weeks;
        ELSE
            NEW.hourly_rate := NULL;
            NEW.hours_per_week := NULL;
            NEW.duration_weeks := NULL;
        END IF;
        RETURN NEW;
    END IF;

    -- Hire only: several hires, judged on an unpaid assessment.
    IF coalesce(btrim(NEW.assessment_title), '') = ''
        OR coalesce(btrim(NEW.assessment_description), '') = ''
        OR cardinality(NEW.assessment_requirements) = 0
        OR cardinality(NEW.deliverables) = 0 THEN
        RAISE EXCEPTION 'A hiring opportunity needs an assessment: a title, a brief, requirements and deliverables.'
            USING ERRCODE = 'P0001';
    END IF;
    IF NEW.project_deadline < NEW.application_deadline THEN
        RAISE EXCEPTION 'The assessment deadline can''t be before the application deadline.'
            USING ERRCODE = 'P0001';
    END IF;

    NEW.purpose := 'hire';
    NEW.payment_amount := 0;
    NEW.acceptance_criteria := '{}';
    NEW.pricing_model := NULL;
    NEW.hourly_rate := NULL;
    NEW.hours_per_week := NULL;
    NEW.duration_weeks := NULL;
    RETURN NEW;
END;
$$;

-- 2. Milestones -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    -- 'planned': listed in a fixed-price brief. 'hours': an hourly log.
    kind TEXT NOT NULL DEFAULT 'planned',
    title TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    hours NUMERIC(5, 1),
    period_start DATE,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'planned',
    work_url TEXT,
    work_note TEXT,
    review_note TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT freelance_milestones_kind_check CHECK (kind IN ('planned', 'hours')),
    CONSTRAINT freelance_milestones_status_check CHECK (status IN (
        'planned', 'submitted', 'changes_requested', 'approved', 'paid', 'cancelled')),
    CONSTRAINT freelance_milestones_title_check CHECK (char_length(btrim(title)) BETWEEN 2 AND 150),
    CONSTRAINT freelance_milestones_text_check CHECK (
        (description IS NULL OR char_length(description) <= 2000)
        AND (work_note IS NULL OR char_length(work_note) <= 4000)
        AND (review_note IS NULL OR char_length(review_note) <= 2000)
        AND (work_url IS NULL OR (work_url ~* '^https?://' AND char_length(work_url) <= 500))),
    CONSTRAINT freelance_milestones_amount_check CHECK (amount BETWEEN 0 AND 10000000),
    CONSTRAINT freelance_milestones_hours_check CHECK (
        (kind = 'planned' AND hours IS NULL)
        OR (kind = 'hours' AND hours > 0 AND hours <= 80))
);

CREATE INDEX IF NOT EXISTS idx_freelance_milestones_project
    ON public.freelance_milestones(project_id, position);

DROP TRIGGER IF EXISTS set_updated_at ON public.freelance_milestones;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.freelance_milestones
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.freelance_milestones ENABLE ROW LEVEL SECURITY;

-- The selected freelancer on this project, if any (contracts have one).
CREATE OR REPLACE FUNCTION public.freelance_contractor(target_project_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT candidate_id FROM public.project_selections
    WHERE project_id = target_project_id
    ORDER BY selected_at DESC
    LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.freelance_contractor(UUID) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Company and freelancer read milestones" ON public.freelance_milestones;
CREATE POLICY "Company and freelancer read milestones"
    ON public.freelance_milestones FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = freelance_milestones.project_id
              AND public.is_company_member(p.company_id))
        OR EXISTS (
            SELECT 1 FROM public.project_selections s
            WHERE s.project_id = freelance_milestones.project_id
              AND s.candidate_id = public.get_current_candidate_id())
    );

-- The plan is written with the posting, before anyone is selected.
DROP POLICY IF EXISTS "Company plans milestones" ON public.freelance_milestones;
CREATE POLICY "Company plans milestones"
    ON public.freelance_milestones FOR INSERT TO authenticated
    WITH CHECK (
        kind = 'planned'
        AND status = 'planned'
        AND work_url IS NULL AND work_note IS NULL AND review_note IS NULL
        AND submitted_at IS NULL AND reviewed_at IS NULL
        AND paid_at IS NULL AND payment_confirmed_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = freelance_milestones.project_id
              AND p.opportunity_type = 'freelance'
              AND p.pricing_model = 'fixed'
              AND p.status IN ('draft', 'applications_open')
              AND public.is_company_member(p.company_id))
        AND NOT EXISTS (
            SELECT 1 FROM public.project_selections s
            WHERE s.project_id = freelance_milestones.project_id)
    );

-- Applicants read the plan from the brief; the work itself stays private.
CREATE OR REPLACE FUNCTION public.freelance_milestone_plan(target_project_id UUID)
RETURNS TABLE (
    "position" INTEGER,
    title TEXT,
    description TEXT,
    amount INTEGER,
    due_date TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT m.position, m.title, m.description, m.amount, m.due_date
    FROM public.freelance_milestones m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.project_id = target_project_id
      AND m.kind = 'planned'
      AND (
          p.status IN ('published', 'applications_open', 'candidate_selected',
                       'in_progress', 'completed')
          OR public.is_company_member(p.company_id)
          OR public.has_applied_to_project(p.id)
          OR public.is_admin())
    ORDER BY m.position;
$$;
REVOKE ALL ON FUNCTION public.freelance_milestone_plan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.freelance_milestone_plan(UUID) TO anon, authenticated;

-- 3. The contract's life ---------------------------------------------------------------

-- Raises unless the caller is on the given side of this contract:
-- 'company' (a member of the posting company, or an admin) or 'freelancer'
-- (the selected candidate).
CREATE OR REPLACE FUNCTION public.assert_freelance_side(target_project_id UUID, side TEXT)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    owner_company UUID;
BEGIN
    SELECT company_id INTO owner_company FROM public.projects WHERE id = target_project_id;
    IF side = 'company' THEN
        IF NOT (public.is_company_member(owner_company) OR public.is_admin()) THEN
            RAISE EXCEPTION 'Only the company can do this.' USING ERRCODE = '42501';
        END IF;
    ELSIF public.get_current_candidate_id() IS NULL
        OR public.freelance_contractor(target_project_id)
           IS DISTINCT FROM public.get_current_candidate_id() THEN
        RAISE EXCEPTION 'Only the selected freelancer can do this.' USING ERRCODE = '42501';
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_freelance_side(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- The milestone, locked for the rest of the transaction.
CREATE OR REPLACE FUNCTION public.lock_freelance_milestone(target_milestone_id UUID)
RETURNS public.freelance_milestones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.freelance_milestones;
BEGIN
    SELECT * INTO m FROM public.freelance_milestones
    WHERE id = target_milestone_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Milestone not found.' USING ERRCODE = 'P0002';
    END IF;
    RETURN m;
END;
$$;
REVOKE ALL ON FUNCTION public.lock_freelance_milestone(UUID) FROM PUBLIC, anon, authenticated;

-- True while the contract is running (selected, not completed or cancelled).
CREATE OR REPLACE FUNCTION public.freelance_contract_active(target_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_selections
        WHERE project_id = target_project_id
          AND status NOT IN ('completed', 'cancelled', 'not_accepted'));
$$;
REVOKE ALL ON FUNCTION public.freelance_contract_active(UUID) FROM PUBLIC, anon, authenticated;

-- Freelancer: deliver a planned milestone (again, after changes were asked for).
CREATE OR REPLACE FUNCTION public.submit_freelance_milestone(
    target_milestone_id UUID,
    work_link TEXT,
    note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.freelance_milestones;
BEGIN
    m := public.lock_freelance_milestone(target_milestone_id);
    PERFORM public.assert_freelance_side(m.project_id, 'freelancer');

    IF NOT public.freelance_contract_active(m.project_id) THEN
        RAISE EXCEPTION 'This contract has ended.' USING ERRCODE = 'P0001';
    END IF;
    IF m.kind <> 'planned' OR m.status NOT IN ('planned', 'changes_requested') THEN
        RAISE EXCEPTION 'This milestone isn''t waiting for delivery.' USING ERRCODE = 'P0001';
    END IF;
    IF coalesce(char_length(btrim(note)), 0) < 10 THEN
        RAISE EXCEPTION 'Describe what you delivered (at least 10 characters).'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.freelance_milestones
    SET status = 'submitted',
        work_url = nullif(btrim(work_link), ''),
        work_note = btrim(note),
        submitted_at = now(),
        reviewed_at = NULL
    WHERE id = m.id;
END;
$$;

-- Freelancer: log a week of hourly work.
CREATE OR REPLACE FUNCTION public.log_freelance_hours(
    target_project_id UUID,
    week_start DATE,
    worked NUMERIC,
    note TEXT,
    work_link TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    p public.projects;
    new_id UUID;
BEGIN
    SELECT * INTO p FROM public.projects WHERE id = target_project_id FOR UPDATE;
    IF NOT FOUND OR p.opportunity_type <> 'freelance' OR p.pricing_model <> 'hourly' THEN
        RAISE EXCEPTION 'Hours can only be logged on an hourly contract.' USING ERRCODE = 'P0001';
    END IF;
    IF public.get_current_candidate_id() IS NULL
        OR public.freelance_contractor(p.id) IS DISTINCT FROM public.get_current_candidate_id() THEN
        RAISE EXCEPTION 'Only the selected freelancer can log hours.' USING ERRCODE = '42501';
    END IF;
    IF NOT public.freelance_contract_active(p.id) THEN
        RAISE EXCEPTION 'This contract has ended.' USING ERRCODE = 'P0001';
    END IF;
    IF worked IS NULL OR worked <= 0 OR worked > 80 THEN
        RAISE EXCEPTION 'Log between 0.5 and 80 hours for a week.' USING ERRCODE = 'P0001';
    END IF;
    IF week_start IS NULL OR week_start > current_date THEN
        RAISE EXCEPTION 'Choose the week you worked.' USING ERRCODE = 'P0001';
    END IF;
    IF coalesce(char_length(btrim(note)), 0) < 10 THEN
        RAISE EXCEPTION 'Describe the work you did (at least 10 characters).'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.freelance_milestones (
        project_id, position, kind, title, amount, hours, period_start,
        status, work_url, work_note, submitted_at
    )
    VALUES (
        p.id,
        (SELECT coalesce(max(position), 0) + 1 FROM public.freelance_milestones
         WHERE project_id = p.id),
        'hours',
        'Week of ' || to_char(week_start, 'DD Mon YYYY'),
        round(worked * p.hourly_rate)::integer,
        round(worked, 1),
        week_start,
        'submitted',
        nullif(btrim(work_link), ''),
        btrim(note),
        now()
    )
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$;

-- Company: approve delivered work, or ask for changes (with a reason).
CREATE OR REPLACE FUNCTION public.review_freelance_milestone(
    target_milestone_id UUID,
    decision TEXT,
    note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.freelance_milestones;
BEGIN
    m := public.lock_freelance_milestone(target_milestone_id);
    PERFORM public.assert_freelance_side(m.project_id, 'company');

    IF m.status <> 'submitted' THEN
        RAISE EXCEPTION 'Only delivered work can be reviewed.' USING ERRCODE = 'P0001';
    END IF;
    IF decision NOT IN ('approved', 'changes_requested') THEN
        RAISE EXCEPTION 'Approve the work or ask for changes.' USING ERRCODE = 'P0001';
    END IF;
    IF decision = 'changes_requested' AND coalesce(char_length(btrim(note)), 0) < 10 THEN
        RAISE EXCEPTION 'Say what needs to change (at least 10 characters).'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.freelance_milestones
    SET status = decision,
        review_note = nullif(btrim(note), ''),
        reviewed_at = now()
    WHERE id = m.id;
END;
$$;

-- Company: record that it paid an approved milestone.
CREATE OR REPLACE FUNCTION public.mark_freelance_milestone_paid(target_milestone_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.freelance_milestones;
BEGIN
    m := public.lock_freelance_milestone(target_milestone_id);
    PERFORM public.assert_freelance_side(m.project_id, 'company');

    IF m.status <> 'approved' THEN
        RAISE EXCEPTION 'Approve the work before marking it paid.' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.freelance_milestones
    SET status = 'paid', paid_at = now()
    WHERE id = m.id;
END;
$$;

-- Freelancer: confirm the payment arrived.
CREATE OR REPLACE FUNCTION public.confirm_freelance_payment(target_milestone_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.freelance_milestones;
BEGIN
    m := public.lock_freelance_milestone(target_milestone_id);
    PERFORM public.assert_freelance_side(m.project_id, 'freelancer');

    IF m.status <> 'paid' OR m.payment_confirmed_at IS NOT NULL THEN
        RAISE EXCEPTION 'There''s no payment to confirm here.' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.freelance_milestones
    SET payment_confirmed_at = now()
    WHERE id = m.id;
END;
$$;

-- Company: end the contract. Work still waiting for review must be reviewed
-- first; milestones never delivered are cancelled. With at least one approved
-- milestone the contract is completed (and becomes verified work); without
-- any, it simply ends.
CREATE OR REPLACE FUNCTION public.complete_freelance_contract(target_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    p public.projects;
    outcome TEXT;
BEGIN
    SELECT * INTO p FROM public.projects WHERE id = target_project_id FOR UPDATE;
    IF NOT FOUND OR p.opportunity_type <> 'freelance' THEN
        RAISE EXCEPTION 'Not a freelance contract.' USING ERRCODE = 'P0001';
    END IF;
    IF NOT (public.is_company_member(p.company_id) OR public.is_admin()) THEN
        RAISE EXCEPTION 'Only the company can end the contract.' USING ERRCODE = '42501';
    END IF;
    IF NOT public.freelance_contract_active(p.id) THEN
        RAISE EXCEPTION 'This contract has already ended.' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.freelance_milestones
               WHERE project_id = p.id AND status = 'submitted') THEN
        RAISE EXCEPTION 'Review the delivered work before ending the contract.'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.freelance_milestones
    SET status = 'cancelled'
    WHERE project_id = p.id AND status IN ('planned', 'changes_requested');

    outcome := CASE WHEN EXISTS (
        SELECT 1 FROM public.freelance_milestones
        WHERE project_id = p.id AND status IN ('approved', 'paid'))
        THEN 'completed' ELSE 'cancelled' END;

    UPDATE public.project_selections
    SET status = outcome
    WHERE project_id = p.id
      AND status NOT IN ('completed', 'cancelled', 'not_accepted');

    PERFORM public.refresh_project_progress(p.id);

    PERFORM public.notify_user(
        public.candidate_user_id(public.freelance_contractor(p.id)), p.id,
        'submission_status',
        CASE outcome WHEN 'completed' THEN 'Contract completed' ELSE 'Contract ended' END,
        p.title,
        '/candidate/contracts/' || p.id);
    RETURN outcome;
END;
$$;

DO $$
DECLARE
    fn TEXT;
BEGIN
    FOREACH fn IN ARRAY ARRAY[
        'public.submit_freelance_milestone(UUID, TEXT, TEXT)',
        'public.log_freelance_hours(UUID, DATE, NUMERIC, TEXT, TEXT)',
        'public.review_freelance_milestone(UUID, TEXT, TEXT)',
        'public.mark_freelance_milestone_paid(UUID)',
        'public.confirm_freelance_payment(UUID)',
        'public.complete_freelance_contract(UUID)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
END;
$$;

-- 4. Notifications: each side hears about the other's move ------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_freelance_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    project_title TEXT;
    freelancer UUID;
    contract_path TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
        AND NEW.payment_confirmed_at IS NOT DISTINCT FROM OLD.payment_confirmed_at THEN
        RETURN NEW;
    END IF;

    SELECT title INTO project_title FROM public.projects WHERE id = NEW.project_id;
    freelancer := public.candidate_user_id(public.freelance_contractor(NEW.project_id));
    contract_path := '/company/projects/' || NEW.project_id || '/contract';

    IF NEW.status = 'submitted' THEN
        PERFORM public.notify_project_company(
            NEW.project_id, 'work_submitted',
            CASE NEW.kind WHEN 'hours' THEN 'Hours logged' ELSE 'Milestone delivered' END,
            NEW.title || ' · ' || project_title, contract_path);
    ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('approved', 'changes_requested', 'paid')
        AND NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM public.notify_user(
            freelancer, NEW.project_id, 'submission_status',
            CASE NEW.status
                WHEN 'approved' THEN 'Work approved'
                WHEN 'changes_requested' THEN 'Changes requested'
                ELSE 'Marked as paid — please confirm'
            END,
            NEW.title || ' · ' || project_title,
            '/candidate/contracts/' || NEW.project_id);
    ELSIF TG_OP = 'UPDATE' AND NEW.payment_confirmed_at IS NOT NULL
        AND OLD.payment_confirmed_at IS NULL THEN
        PERFORM public.notify_project_company(
            NEW.project_id, 'submission_status', 'Payment confirmed',
            NEW.title || ' · ' || project_title, contract_path);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_freelance_milestone ON public.freelance_milestones;
CREATE TRIGGER notify_on_freelance_milestone
    AFTER INSERT OR UPDATE ON public.freelance_milestones
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_freelance_milestone();
