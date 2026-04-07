-- ============================================================
-- 1. Add is_company_admin to profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_company_admin boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. team_invitations
-- ============================================================
CREATE TABLE public.team_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invited_by    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  display_name  text,
  token         uuid        NOT NULL DEFAULT gen_random_uuid(),
  status        text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','expired','revoked')),
  message       text,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_invitations_token_unique UNIQUE (token)
);

-- Prevent duplicate pending invitations for the same email within a company
CREATE UNIQUE INDEX team_invitations_pending_email_idx
  ON public.team_invitations (company_id, email)
  WHERE status = 'pending';

-- Fast token lookups (e.g. accept-invite flow)
CREATE INDEX team_invitations_token_idx
  ON public.team_invitations (token);

CREATE TRIGGER team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Company admins can manage invitations for their own company
CREATE POLICY "Company admins manage team_invitations"
  ON public.team_invitations
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT is_company_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- ============================================================
-- 3. skill_snapshots
-- ============================================================
CREATE TABLE public.skill_snapshots (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id     uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  overall_score  int         NOT NULL,
  phase_scores   jsonb       NOT NULL DEFAULT '{}',
  service_scores jsonb       NOT NULL DEFAULT '{}',
  source         text        NOT NULL
                               CHECK (source IN ('onboarding','assessment','course_completion')),
  source_id      uuid,
  snapshot_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX skill_snapshots_company_time_idx
  ON public.skill_snapshots (company_id, snapshot_at);

CREATE INDEX skill_snapshots_user_time_idx
  ON public.skill_snapshots (user_id, snapshot_at);

ALTER TABLE public.skill_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots
CREATE POLICY "Users read own skill_snapshots"
  ON public.skill_snapshots
  FOR SELECT
  USING (user_id = auth.uid());

-- Company admins can read all snapshots within their company
CREATE POLICY "Company admins read company skill_snapshots"
  ON public.skill_snapshots
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT is_company_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- No INSERT policy for regular users — snapshots are written via service-role only
