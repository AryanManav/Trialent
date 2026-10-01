-- A freelancer who is selected hears that their contract has started, with a
-- link to the contract page. Before this, freelance selections fell through to
-- the generic "You've been selected" notice that linked to My applications.
--
-- Same function as 20261005000000_hire_only.sql plus the freelance branch.
-- Run after 20261009000000_freelance_gigs.sql. Safe to re-run.

CREATE OR REPLACE FUNCTION public.notify_on_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    project_title TEXT;
    project_type TEXT;
    candidate_name TEXT;
    note TEXT := nullif(btrim(coalesce(NEW.decision_note, '')), '');
    new_status TEXT := NEW.status::text;
BEGIN
    SELECT title, opportunity_type INTO project_title, project_type
    FROM public.projects WHERE id = NEW.project_id;
    candidate_name := public.candidate_display_name(NEW.candidate_id);

    IF TG_OP = 'INSERT' THEN
        PERFORM public.notify_project_company(
            NEW.project_id, 'application_received', 'New applicant',
            candidate_name || ' applied to ' || project_title,
            '/company/projects/' || NEW.project_id || '/applicants/' || NEW.id);
        RETURN NEW;
    END IF;

    IF new_status IS NOT DISTINCT FROM OLD.status::text THEN
        RETURN NEW;
    END IF;

    IF new_status = 'withdrawn' THEN
        PERFORM public.notify_project_company(
            NEW.project_id, 'application_withdrawn', 'Application withdrawn',
            candidate_name || ' withdrew from ' || project_title,
            '/company/projects/' || NEW.project_id);
    ELSIF new_status = 'selected' AND project_type = 'freelance' THEN
        PERFORM public.notify_user(
            public.candidate_user_id(NEW.candidate_id), NEW.project_id,
            'application_status', 'You were selected for ' || project_title,
            coalesce(note, 'Your contract has started — deliver the first milestone or log your hours on the contract page.'),
            '/candidate/contracts/' || NEW.project_id);
    ELSIF new_status = 'selected' AND project_type = 'build' THEN
        PERFORM public.notify_user(
            public.candidate_user_id(NEW.candidate_id), NEW.project_id,
            'application_status', 'You were selected for ' || project_title,
            coalesce(note, 'The brief and your workspace are ready — start building.'),
            '/candidate/trials/' || NEW.project_id);
    ELSIF new_status IN ('reviewing', 'shortlisted', 'interview', 'selected', 'rejected') THEN
        PERFORM public.notify_user(
            public.candidate_user_id(NEW.candidate_id), NEW.project_id,
            'application_status',
            CASE new_status
                WHEN 'reviewing' THEN 'Application under review'
                WHEN 'shortlisted' THEN 'You''ve been shortlisted for ' || project_title
                WHEN 'interview' THEN 'You''ve been invited to interview for ' || project_title
                WHEN 'selected' THEN 'You''ve been selected for ' || project_title
                ELSE 'Application not selected'
            END,
            coalesce(note, project_title),
            '/candidate/applications');
    END IF;

    RETURN NEW;
END;
$$;
