-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates the table that stores each customer's yeti personality

create table yeti_configs (
  id bigint generated always as identity primary key,
  yeti_id text unique not null,
  domain text not null,
  business_name text not null,
  prompt text not null,
  pages text[] default '{}',
  created_at timestamptz default now()
);

-- Allow anyone to READ configs (the widget needs this)
alter table yeti_configs enable row level security;

create policy "Anyone can read yeti configs"
  on yeti_configs for select
  using (true);

-- Allow anonymous inserts (from the onboarding page)
create policy "Anyone can insert yeti configs"
  on yeti_configs for insert
  with check (true);

-- Index for fast lookups by yeti_id
create index idx_yeti_configs_yeti_id on yeti_configs (yeti_id);
