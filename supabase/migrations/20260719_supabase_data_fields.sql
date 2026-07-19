-- Fields used by the Supabase-only client data layer.
-- This migration deliberately does not import Google Sheets or localStorage data.

alter table public.household_settings
  add column if not exists currency text not null default 'EUR',
  add column if not exists base_currency text not null default 'EUR',
  add column if not exists starting_balance numeric not null default 0;

alter table public.categories
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists type text,
  add column if not exists position integer not null default 0,
  add column if not exists archived_at timestamptz;

alter table public.category_limits
  add column if not exists month_key text,
  add column if not exists amount numeric not null default 0;

create index if not exists category_limits_household_category_month_idx
  on public.category_limits (household_id, category_id, month_key);
