-- EPSA Gestão Comercial / Supabase Gestao Comercial Temporario only
-- Restrictive RLS: MFA enforced only for users with an already VERIFIED factor.
-- Does not require users without a factor to enroll; does not change existing permissive policies.
-- Function is private and only consulted by existing authenticated RLS paths.
CREATE OR REPLACE FUNCTION gc_private.gc_session_mfa_ok()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
 SELECT (SELECT auth.uid()) IS NOT NULL
    AND (
      (SELECT auth.jwt() ->> 'aal') = 'aal2'
      OR NOT EXISTS(
        SELECT 1 FROM auth.mfa_factors AS f
        WHERE f.user_id = (SELECT auth.uid()) AND f.status = 'verified'
      )
    );
$function$;

REVOKE ALL ON FUNCTION gc_private.gc_session_mfa_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION gc_private.gc_session_mfa_ok() TO authenticated;

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_coaching_feedback
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_companies
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_daily_reports
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_digital_followup_events
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_digital_opportunities
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_digital_stage_events
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_memberships
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_monthly_goals
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_team_members
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_team_monthly_goals
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));

CREATE POLICY gc_mfa_existing_factor_gate
 ON public.gc_teams
 AS RESTRICTIVE FOR ALL TO authenticated
 USING ((SELECT gc_private.gc_session_mfa_ok()))
 WITH CHECK ((SELECT gc_private.gc_session_mfa_ok()));
