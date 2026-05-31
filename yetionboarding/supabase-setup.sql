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

create extension if not exists pg_trgm;

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

-- Cached FAQ answers. The API checks this before calling the AI, so repeated
-- questions like "how much is the plan" and "how much is the plan worth" can
-- reuse the same saved answer quickly.
create table if not exists public.yeti_faq_answers (
  id bigint generated always as identity primary key,
  yeti_id text not null references public.yeti_configs (yeti_id) on delete cascade,
  question text not null,
  normalized_question text not null,
  answer text not null,
  hit_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yeti_id, normalized_question)
);

create index if not exists idx_yeti_faq_answers_yeti_id
  on public.yeti_faq_answers (yeti_id);

create index if not exists idx_yeti_faq_answers_question_trgm
  on public.yeti_faq_answers using gin (normalized_question gin_trgm_ops);

-- Stripe subscription records written by /api/stripe-webhook.
create table if not exists public.yeti_subscriptions (
  id bigint generated always as identity primary key,
  stripe_customer_id text,
  stripe_subscription_id text unique not null,
  stripe_checkout_session_id text,
  user_email text,
  plan text,
  billing_interval text,
  status text,
  websites_limit integer,
  questions_limit integer,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_yeti_subscriptions_customer_id
  on public.yeti_subscriptions (stripe_customer_id);

create index if not exists idx_yeti_subscriptions_user_email
  on public.yeti_subscriptions (user_email);

-- Monthly AI question credits consumed by widgets.
create table if not exists public.yeti_usage_monthly (
  id bigint generated always as identity primary key,
  user_email text not null,
  month text not null,
  questions_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, month)
);

create index if not exists idx_yeti_usage_monthly_user_email
  on public.yeti_usage_monthly (user_email);

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
drop policy if exists "Service can manage Yeti FAQ answers" on public.yeti_faq_answers;
drop policy if exists "Service can manage Yeti subscriptions" on public.yeti_subscriptions;
drop policy if exists "Service can manage Yeti usage" on public.yeti_usage_monthly;

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

alter table public.yeti_faq_answers enable row level security;

create policy "Service can manage Yeti FAQ answers"
  on public.yeti_faq_answers
  for all
  to service_role
  using (true)
  with check (true);

alter table public.yeti_subscriptions enable row level security;

create policy "Service can manage Yeti subscriptions"
  on public.yeti_subscriptions
  for all
  to service_role
  using (true)
  with check (true);

alter table public.yeti_usage_monthly enable row level security;

create policy "Service can manage Yeti usage"
  on public.yeti_usage_monthly
  for all
  to service_role
  using (true)
  with check (true);

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

-- Normalize question wording for fuzzy matching.
create or replace function public.normalize_yeti_question(input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        lower(coalesce(input, '')),
        '\b(please|hey|hi|hello|the|a|an|is|are|do|does|can|you|tell|me|about)\b',
        ' ',
        'g'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.match_yeti_faq(
  p_yeti_id text,
  p_question text,
  p_threshold real default 0.5
)
returns table (
  id bigint,
  answer text,
  score real,
  hit_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := public.normalize_yeti_question(p_question);
begin
  return query
  with best_match as (
    select
      yfa.id,
      yfa.answer,
      similarity(yfa.normalized_question, normalized) as score,
      yfa.hit_count
    from public.yeti_faq_answers yfa
    where yfa.yeti_id = p_yeti_id
      and similarity(yfa.normalized_question, normalized) >= p_threshold
    order by score desc, yfa.hit_count desc, yfa.updated_at desc
    limit 1
  ),
  bumped as (
    update public.yeti_faq_answers yfa
    set hit_count = yfa.hit_count + 1,
        updated_at = now()
    from best_match
    where yfa.id = best_match.id
    returning yfa.id
  )
  select best_match.id, best_match.answer, best_match.score, best_match.hit_count
  from best_match;
end;
$$;

create or replace function public.upsert_yeti_faq(
  p_yeti_id text,
  p_question text,
  p_answer text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := public.normalize_yeti_question(p_question);
begin
  if normalized = '' or length(coalesce(p_answer, '')) < 2 then
    return;
  end if;

  insert into public.yeti_faq_answers (
    yeti_id,
    question,
    normalized_question,
    answer
  )
  values (
    p_yeti_id,
    p_question,
    normalized,
    p_answer
  )
  on conflict (yeti_id, normalized_question)
  do update set
    answer = excluded.answer,
    question = excluded.question,
    hit_count = public.yeti_faq_answers.hit_count + 1,
    updated_at = now();
end;
$$;

create or replace function public.increment_yeti_question_usage(
  p_user_email text
)
returns table (
  questions_used integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month text := to_char(now(), 'YYYY-MM');
begin
  return query
  insert into public.yeti_usage_monthly (
    user_email,
    month,
    questions_used
  )
  values (
    p_user_email,
    current_month,
    1
  )
  on conflict (user_email, month)
  do update set
    questions_used = public.yeti_usage_monthly.questions_used + 1,
    updated_at = now()
  returning public.yeti_usage_monthly.questions_used;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. API permissions (anon + authenticated clients)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.yeti_configs to anon, authenticated;
grant insert, update, delete on public.yeti_configs to authenticated;
grant all on public.yeti_subscriptions to service_role;
grant all on public.yeti_usage_monthly to service_role;
grant execute on function public.match_yeti_faq(text, text, real) to service_role;
grant execute on function public.upsert_yeti_faq(text, text, text) to service_role;
grant execute on function public.increment_yeti_question_usage(text) to service_role;

-- -----------------------------------------------------------------------------
-- Done. In Supabase UI also confirm:
--   Authentication → Providers → Google (enabled)
--   Authentication → URL Configuration:
--     Site URL: https://ai-mascot-on-websites.vercel.app
--     Redirect URLs:
--       https://ai-mascot-on-websites.vercel.app
--       https://ai-mascot-on-websites.vercel.app/**
-- =============================================================================
