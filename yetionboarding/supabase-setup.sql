-- =============================================================================
-- Yeti Guide — Supabase SQL (run in Dashboard → SQL Editor → New query → Run)
-- Safe on a NEW project or to UPGRADE an existing yeti_configs table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
create table if not exists public.yeti_configs (
  id bigint generated always as identity primary key,
  yeti_id text unique not null,
  domain text not null,
  business_name text not null,
  prompt text not null,
  pages text[] not null default '{}',
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  created_at_et text,
  created_at timestamptz not null default now()
);

-- If you ran an older script without these owner fields:
alter table public.yeti_configs
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.yeti_configs
  add column if not exists user_email text;

alter table public.yeti_configs
  add column if not exists created_at_et text;

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_yeti_configs_yeti_id on public.yeti_configs (yeti_id);
create index if not exists idx_yeti_configs_user_id on public.yeti_configs (user_id);
create index if not exists idx_yeti_configs_user_email on public.yeti_configs (user_email);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
alter table public.yeti_configs enable row level security;

-- Remove old policies from earlier setup
drop policy if exists "Anyone can read yeti configs" on public.yeti_configs;
drop policy if exists "Anyone can insert yeti configs" on public.yeti_configs;
drop policy if exists "Public read yeti configs" on public.yeti_configs;
drop policy if exists "Authenticated insert yeti configs" on public.yeti_configs;
drop policy if exists "Users update own yeti configs" on public.yeti_configs;
drop policy if exists "Users delete own yeti configs" on public.yeti_configs;

-- Widget + embed: read any config by yeti_id (anon key)
create policy "Public read yeti configs"
  on public.yeti_configs
  for select
  using (true);

-- Onboarding (after Google sign-in): signed-in users can create Yetis
create policy "Authenticated insert yeti configs"
  on public.yeti_configs
  for insert
  to authenticated
  with check (true);

-- Optional: owners can edit/delete their own Yetis later
create policy "Users update own yeti configs"
  on public.yeti_configs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own yeti configs"
  on public.yeti_configs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. Auto-link Google user email and clean Eastern Time to each saved Yeti
-- -----------------------------------------------------------------------------
create or replace function public.set_yeti_config_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  if new.user_email is null then
    new.user_email := auth.jwt() ->> 'email';
  end if;
  if new.created_at_et is null then
    new.created_at_et := to_char(
      new.created_at at time zone 'America/New_York',
      'Mon DD, YYYY HH12:MI AM'
    ) || ' ET';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_yeti_config_owner on public.yeti_configs;
create trigger trg_set_yeti_config_owner
  before insert on public.yeti_configs
  for each row
  execute function public.set_yeti_config_owner();

-- -----------------------------------------------------------------------------
-- 5. API permissions (anon + authenticated clients)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.yeti_configs to anon, authenticated;
grant insert, update, delete on public.yeti_configs to authenticated;

-- -----------------------------------------------------------------------------
-- Done. In Supabase UI also confirm:
--   Authentication → Providers → Google (enabled)
--   Authentication → URL Configuration:
--     Site URL: https://ai-mascot-on-websites.vercel.app
--     Redirect URLs:
--       https://ai-mascot-on-websites.vercel.app
--       https://ai-mascot-on-websites.vercel.app/**
-- =============================================================================
