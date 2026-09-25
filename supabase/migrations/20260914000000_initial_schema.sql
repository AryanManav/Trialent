-- ============================================================================
-- TRIALENT INITIAL SCHEMA MIGRATION (IDEMPOTENT)
-- Project-Based Talent Discovery & Evaluation Platform for Startups
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'company', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM (
        'draft',
        'pending_review',
        'published',
        'applications_open',
        'candidate_selected',
        'in_progress',
        'submitted',
        'under_review',
        'revision_requested',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM (
        'submitted',
        'reviewing',
        'shortlisted',
        'selected',
        'rejected',
        'withdrawn'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM (
        'submitted',
        'under_review',
        'revision_requested',
        'accepted',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_outcome_type AS ENUM (
        'no_hire',
        'interview',
        'hire',
        'talent_pool',
        'candidate_withdrew',
        'project_cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'paid',
        'processing',
        'completed',
        'refunded',
        'failed',
        'disputed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. USERS TABLE (Linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'candidate',
    avatar_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ----------------------------------------------------------------------------
-- 3. CANDIDATE TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    headline TEXT,
    bio TEXT,
    location TEXT,
    education TEXT,
    graduation_year INTEGER,
    resume_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    linkedin_url TEXT,
    availability TEXT DEFAULT 'immediate',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON public.candidate_profiles(user_id);

CREATE TABLE IF NOT EXISTS public.candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    skill_level TEXT DEFAULT 'intermediate',
    years_experience NUMERIC(3,1) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate ON public.candidate_skills(candidate_id);

CREATE TABLE IF NOT EXISTS public.candidate_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    technologies TEXT[] DEFAULT '{}',
    repository_url TEXT,
    live_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_candidate_projects_candidate ON public.candidate_projects(candidate_id);

-- ----------------------------------------------------------------------------
-- 4. COMPANY TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website TEXT,
    description TEXT,
    industry TEXT,
    company_size TEXT,
    location TEXT,
    logo_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);

-- ----------------------------------------------------------------------------
-- 5. PROJECT TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    context TEXT NOT NULL,
    requirements TEXT[] NOT NULL DEFAULT '{}',
    deliverables TEXT[] NOT NULL DEFAULT '{}',
    acceptance_criteria TEXT[] NOT NULL DEFAULT '{}',
    evaluation_criteria TEXT[] NOT NULL DEFAULT '{}',
    expected_hours INTEGER NOT NULL DEFAULT 10,
    payment_amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    application_deadline TIMESTAMPTZ NOT NULL,
    project_deadline TIMESTAMPTZ NOT NULL,
    status project_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);

CREATE TABLE IF NOT EXISTS public.project_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_project_skills_project ON public.project_skills(project_id);

-- ----------------------------------------------------------------------------
-- 6. APPLICATION & SELECTION TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    cover_message TEXT NOT NULL,
    relevant_experience TEXT,
    status application_status NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_project ON public.applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON public.applications(candidate_id);

CREATE TABLE IF NOT EXISTS public.project_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    selected_by UUID NOT NULL REFERENCES public.users(id),
    selected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_selections_project ON public.project_selections(project_id);
CREATE INDEX IF NOT EXISTS idx_selections_candidate ON public.project_selections(candidate_id);

-- ----------------------------------------------------------------------------
-- 7. SUBMISSION & EVALUATION TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    repository_url TEXT NOT NULL,
    deployment_url TEXT,
    submission_notes TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status submission_status NOT NULL DEFAULT 'submitted'
);

CREATE INDEX IF NOT EXISTS idx_submissions_project ON public.project_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_candidate ON public.project_submissions(candidate_id);

CREATE TABLE IF NOT EXISTS public.project_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id),
    requirements_completed BOOLEAN NOT NULL DEFAULT false,
    technical_quality TEXT NOT NULL,
    completeness TEXT NOT NULL,
    testing_quality TEXT NOT NULL,
    documentation_quality TEXT NOT NULL,
    deadline_met BOOLEAN NOT NULL DEFAULT true,
    revisions_required INTEGER NOT NULL DEFAULT 0,
    written_feedback TEXT NOT NULL,
    what_was_missing TEXT,
    would_interview_or_hire TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feedback_project ON public.project_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_candidate ON public.project_feedback(candidate_id);

CREATE TABLE IF NOT EXISTS public.project_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    outcome project_outcome_type NOT NULL,
    reason TEXT,
    interview_date TIMESTAMPTZ,
    hired_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outcomes_project ON public.project_outcomes(project_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_candidate ON public.project_outcomes(candidate_id);

-- ----------------------------------------------------------------------------
-- 8. PAYMENTS & NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    provider_payment_id TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_project ON public.payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link_url TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- ----------------------------------------------------------------------------
-- 9. AUDIT & ADMIN
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.users(id),
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ----------------------------------------------------------------------------
-- 10. HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_company_member(lookup_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id = lookup_company_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_candidate_id()
RETURNS UUID AS $$
DECLARE
    found_id UUID;
BEGIN
    SELECT id INTO found_id
    FROM public.candidate_profiles
    WHERE user_id = auth.uid();
    RETURN found_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val user_role := 'candidate';
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) - DROP IF EXISTS FIRST
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
DROP POLICY IF EXISTS "Users are viewable by authenticated users" ON public.users;
CREATE POLICY "Users are viewable by authenticated users"
    ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
CREATE POLICY "Users can update their own record"
    ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
CREATE POLICY "Admins have full access to users"
    ON public.users FOR ALL TO authenticated USING (public.is_admin());

-- CANDIDATE PROFILES POLICIES
DROP POLICY IF EXISTS "Candidate profiles viewable by authenticated users" ON public.candidate_profiles;
CREATE POLICY "Candidate profiles viewable by authenticated users"
    ON public.candidate_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Candidates can update own profile" ON public.candidate_profiles;
CREATE POLICY "Candidates can update own profile"
    ON public.candidate_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can insert own profile" ON public.candidate_profiles;
CREATE POLICY "Candidates can insert own profile"
    ON public.candidate_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CANDIDATE SKILLS & PROJECTS
DROP POLICY IF EXISTS "Candidate skills viewable by authenticated users" ON public.candidate_skills;
CREATE POLICY "Candidate skills viewable by authenticated users"
    ON public.candidate_skills FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Candidates can manage own skills" ON public.candidate_skills;
CREATE POLICY "Candidates can manage own skills"
    ON public.candidate_skills FOR ALL TO authenticated
    USING (candidate_id = public.get_current_candidate_id())
    WITH CHECK (candidate_id = public.get_current_candidate_id());

DROP POLICY IF EXISTS "Candidate projects viewable by authenticated users" ON public.candidate_projects;
CREATE POLICY "Candidate projects viewable by authenticated users"
    ON public.candidate_projects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Candidates can manage own projects" ON public.candidate_projects;
CREATE POLICY "Candidates can manage own projects"
    ON public.candidate_projects FOR ALL TO authenticated
    USING (candidate_id = public.get_current_candidate_id())
    WITH CHECK (candidate_id = public.get_current_candidate_id());

-- COMPANIES POLICIES
DROP POLICY IF EXISTS "Companies viewable by all authenticated users" ON public.companies;
CREATE POLICY "Companies viewable by all authenticated users"
    ON public.companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Company members can update company" ON public.companies;
CREATE POLICY "Company members can update company"
    ON public.companies FOR UPDATE TO authenticated USING (public.is_company_member(id));

DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
    ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

-- COMPANY MEMBERS POLICIES
DROP POLICY IF EXISTS "Company members can view team" ON public.company_members;
CREATE POLICY "Company members can view team"
    ON public.company_members FOR SELECT TO authenticated
    USING (public.is_company_member(company_id) OR public.is_admin());

DROP POLICY IF EXISTS "Company members manage members" ON public.company_members;
CREATE POLICY "Company members manage members"
    ON public.company_members FOR ALL TO authenticated
    USING (public.is_company_member(company_id) OR public.is_admin())
    WITH CHECK (public.is_company_member(company_id) OR public.is_admin());

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "Published projects viewable by everyone" ON public.projects;
CREATE POLICY "Published projects viewable by everyone"
    ON public.projects FOR SELECT
    USING (status IN ('published', 'applications_open', 'candidate_selected', 'in_progress', 'completed') OR public.is_company_member(company_id) OR public.is_admin());

DROP POLICY IF EXISTS "Company members can create projects" ON public.projects;
CREATE POLICY "Company members can create projects"
    ON public.projects FOR INSERT TO authenticated
    WITH CHECK (public.is_company_member(company_id) OR public.is_admin());

DROP POLICY IF EXISTS "Company members can update own projects" ON public.projects;
CREATE POLICY "Company members can update own projects"
    ON public.projects FOR UPDATE TO authenticated
    USING (public.is_company_member(company_id) OR public.is_admin());

-- PROJECT SKILLS POLICIES
DROP POLICY IF EXISTS "Project skills viewable by all" ON public.project_skills;
CREATE POLICY "Project skills viewable by all"
    ON public.project_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Company members manage project skills" ON public.project_skills;
CREATE POLICY "Company members manage project skills"
    ON public.project_skills FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin())));

-- APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Candidates can view their own applications" ON public.applications;
CREATE POLICY "Candidates can view their own applications"
    ON public.applications FOR SELECT TO authenticated
    USING (candidate_id = public.get_current_candidate_id());

DROP POLICY IF EXISTS "Company members can view applications for their projects" ON public.applications;
CREATE POLICY "Company members can view applications for their projects"
    ON public.applications FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_company_member(p.company_id)));

DROP POLICY IF EXISTS "Candidates can submit applications" ON public.applications;
CREATE POLICY "Candidates can submit applications"
    ON public.applications FOR INSERT TO authenticated
    WITH CHECK (candidate_id = public.get_current_candidate_id());

DROP POLICY IF EXISTS "Company members can update application status" ON public.applications;
CREATE POLICY "Company members can update application status"
    ON public.applications FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin())));

-- SELECTIONS POLICIES
DROP POLICY IF EXISTS "Candidate and company can view selection" ON public.project_selections;
CREATE POLICY "Candidate and company can view selection"
    ON public.project_selections FOR SELECT TO authenticated
    USING (
        candidate_id = public.get_current_candidate_id() OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin()))
    );

DROP POLICY IF EXISTS "Company members can select candidates" ON public.project_selections;
CREATE POLICY "Company members can select candidates"
    ON public.project_selections FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin())));

-- SUBMISSIONS POLICIES
DROP POLICY IF EXISTS "Candidate and company can view submissions" ON public.project_submissions;
CREATE POLICY "Candidate and company can view submissions"
    ON public.project_submissions FOR SELECT TO authenticated
    USING (
        candidate_id = public.get_current_candidate_id() OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin()))
    );

DROP POLICY IF EXISTS "Selected candidate can submit work" ON public.project_submissions;
CREATE POLICY "Selected candidate can submit work"
    ON public.project_submissions FOR INSERT TO authenticated
    WITH CHECK (
        candidate_id = public.get_current_candidate_id() AND
        EXISTS (SELECT 1 FROM public.project_selections ps WHERE ps.project_id = project_submissions.project_id AND ps.candidate_id = candidate_id)
    );

DROP POLICY IF EXISTS "Company can update submission status" ON public.project_submissions;
CREATE POLICY "Company can update submission status"
    ON public.project_submissions FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin())));

-- FEEDBACK POLICIES
DROP POLICY IF EXISTS "Company and candidate can view feedback" ON public.project_feedback;
CREATE POLICY "Company and candidate can view feedback"
    ON public.project_feedback FOR SELECT TO authenticated
    USING (
        candidate_id = public.get_current_candidate_id() OR
        public.is_company_member(company_id) OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "Company members can submit feedback" ON public.project_feedback;
CREATE POLICY "Company members can submit feedback"
    ON public.project_feedback FOR INSERT TO authenticated
    WITH CHECK (public.is_company_member(company_id) OR public.is_admin());

-- OUTCOMES POLICIES
DROP POLICY IF EXISTS "Company and candidate can view outcome" ON public.project_outcomes;
CREATE POLICY "Company and candidate can view outcome"
    ON public.project_outcomes FOR SELECT TO authenticated
    USING (
        candidate_id = public.get_current_candidate_id() OR
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin()))
    );

DROP POLICY IF EXISTS "Company members can record outcome" ON public.project_outcomes;
CREATE POLICY "Company members can record outcome"
    ON public.project_outcomes FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (public.is_company_member(p.company_id) OR public.is_admin())));

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "Company and candidate can view related payments" ON public.payments;
CREATE POLICY "Company and candidate can view related payments"
    ON public.payments FOR SELECT TO authenticated
    USING (
        public.is_company_member(company_id) OR
        candidate_id = public.get_current_candidate_id() OR
        public.is_admin()
    );

DROP POLICY IF EXISTS "Company can initiate payment" ON public.payments;
CREATE POLICY "Company can initiate payment"
    ON public.payments FOR INSERT TO authenticated
    WITH CHECK (public.is_company_member(company_id) OR public.is_admin());

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can only view and update own notifications" ON public.notifications;
CREATE POLICY "Users can only view and update own notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ADMIN NOTES & AUDIT LOGS
DROP POLICY IF EXISTS "Admins only for admin notes" ON public.admin_notes;
CREATE POLICY "Admins only for admin notes"
    ON public.admin_notes FOR ALL TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins only for audit logs" ON public.audit_logs;
CREATE POLICY "Admins only for audit logs"
    ON public.audit_logs FOR ALL TO authenticated
    USING (public.is_admin());
