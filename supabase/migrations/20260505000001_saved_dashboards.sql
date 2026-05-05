-- Saved dashboards: user-owned chart layouts with private/company visibility,
-- plus a per-user default-dashboard preference.

create table public.saved_dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  layout jsonb not null default '{"charts":[]}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private','company')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_dashboards_user_idx on public.saved_dashboards(user_id);
create index saved_dashboards_company_visibility_idx
  on public.saved_dashboards(company_id, visibility);

create table public.user_dashboard_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_dashboard_id uuid references public.saved_dashboards(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- updated_at triggers
create or replace function public.touch_saved_dashboards_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger saved_dashboards_touch_updated_at
  before update on public.saved_dashboards
  for each row execute function public.touch_saved_dashboards_updated_at();

create trigger user_dashboard_prefs_touch_updated_at
  before update on public.user_dashboard_prefs
  for each row execute function public.touch_saved_dashboards_updated_at();

-- RLS
alter table public.saved_dashboards enable row level security;
alter table public.user_dashboard_prefs enable row level security;

-- read: own dashboards, or company-shared dashboards in same company
create policy "saved_dashboards_select"
  on public.saved_dashboards for select
  using (
    auth.uid() = user_id
    or (visibility = 'company' and company_id = public.get_my_company_id())
  );

create policy "saved_dashboards_insert"
  on public.saved_dashboards for insert
  with check (auth.uid() = user_id);

create policy "saved_dashboards_update"
  on public.saved_dashboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_dashboards_delete"
  on public.saved_dashboards for delete
  using (auth.uid() = user_id);

create policy "user_dashboard_prefs_all"
  on public.user_dashboard_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
