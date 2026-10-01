-- Signed-out visitors can read company profiles.
--
-- Browse (/projects) is public, but its cards join companies(name), and the
-- companies table was readable by signed-in users only — so visitors saw
-- every listing as "Startup". Everything in this table is public-profile
-- information (name, website, description, location, logo, stack, culture),
-- so reading it signed out is safe. Writes are unchanged.
--
-- Safe to re-run.

DROP POLICY IF EXISTS "Companies viewable by visitors" ON public.companies;
CREATE POLICY "Companies viewable by visitors"
    ON public.companies FOR SELECT TO anon
    USING (true);
