-- 05. Supabase Schema (PostgreSQL)
create extension if not exists "pgcrypto";

create table if not exists public.goals (
  user_id uuid not null,
  year_month text not null,
  target_net_profit integer not null check (target_net_profit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  year_month text not null,
  type text not null check (type in ('income','expense')),
  amount integer not null check (amount >= 0),
  raw_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_month_created
  on public.transactions (user_id, year_month, created_at desc);

alter table public.goals enable row level security;
alter table public.transactions enable row level security;

create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tx_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "tx_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tx_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);
