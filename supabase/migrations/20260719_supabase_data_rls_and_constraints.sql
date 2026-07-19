-- Canonical constraints and RLS for the Supabase-only application data layer.
-- No legacy Google Sheets or localStorage data is imported by this migration.
-- household_members uses auth_user_id in this project.

alter table public.household_settings
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists currency text not null default 'EUR',
  add column if not exists base_currency text not null default 'EUR',
  add column if not exists starting_balance numeric not null default 0;

alter table public.transactions
  add column if not exists household_id uuid,
  add column if not exists created_by uuid,
  add column if not exists budget_user_id uuid,
  add column if not exists category_id uuid,
  add column if not exists type text,
  add column if not exists amount numeric,
  add column if not exists comment text not null default '',
  add column if not exists transaction_date date,
  add column if not exists transaction_time time,
  add column if not exists occurred_at timestamptz not null default now();

alter table public.categories
  add column if not exists household_id uuid,
  add column if not exists name text,
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists type text,
  add column if not exists position integer not null default 0,
  add column if not exists archived_at timestamptz;

alter table public.category_limits
  add column if not exists household_id uuid,
  add column if not exists category_id uuid,
  add column if not exists month_key text,
  add column if not exists amount numeric not null default 0;

alter table public.budget_users
  add column if not exists household_id uuid,
  add column if not exists name text,
  add column if not exists avatar text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.household_settings'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.household_settings'::regclass and attname = 'household_id')
      ]::smallint[]
  ) then
    alter table public.household_settings
      add constraint household_settings_household_id_key unique (household_id);
  end if;
end $$;

create index if not exists transactions_household_occurred_at_idx
  on public.transactions (household_id, occurred_at desc);
create index if not exists categories_household_position_idx
  on public.categories (household_id, position);
create index if not exists budget_users_household_created_at_idx
  on public.budget_users (household_id, created_at);
create unique index if not exists category_limits_household_category_period_key
  on public.category_limits (household_id, category_id, coalesce(month_key, ''));

alter table public.household_settings enable row level security;
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.category_limits enable row level security;
alter table public.budget_users enable row level security;

do $$
declare
  target_table text;
  target_policy text;
begin
  foreach target_table in array array['household_settings', 'transactions', 'categories', 'category_limits', 'budget_users']
  loop
    for target_policy in
      select policyname from pg_policies where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', target_policy, target_table);
    end loop;
  end loop;
end $$;

drop policy if exists "household_settings_select_own_household" on public.household_settings;
drop policy if exists "household_settings_insert_own_household" on public.household_settings;
drop policy if exists "household_settings_update_own_household" on public.household_settings;
drop policy if exists "transactions_select_own_household" on public.transactions;
drop policy if exists "transactions_insert_own_household" on public.transactions;
drop policy if exists "transactions_update_own_household" on public.transactions;
drop policy if exists "transactions_delete_own_household" on public.transactions;
drop policy if exists "categories_select_own_household" on public.categories;
drop policy if exists "categories_insert_own_household" on public.categories;
drop policy if exists "categories_update_own_household" on public.categories;
drop policy if exists "categories_delete_own_household" on public.categories;
drop policy if exists "category_limits_select_own_household" on public.category_limits;
drop policy if exists "category_limits_insert_own_household" on public.category_limits;
drop policy if exists "category_limits_update_own_household" on public.category_limits;
drop policy if exists "category_limits_delete_own_household" on public.category_limits;
drop policy if exists "budget_users_select_own_household" on public.budget_users;
drop policy if exists "budget_users_insert_own_household" on public.budget_users;
drop policy if exists "budget_users_update_own_household" on public.budget_users;
drop policy if exists "budget_users_delete_own_household" on public.budget_users;

create policy "household_settings_select_own_household" on public.household_settings for select to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = household_settings.household_id and hm.auth_user_id = auth.uid()));
create policy "household_settings_insert_own_household" on public.household_settings for insert to authenticated with check (exists (select 1 from public.household_members hm where hm.household_id = household_settings.household_id and hm.auth_user_id = auth.uid()));
create policy "household_settings_update_own_household" on public.household_settings for update to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = household_settings.household_id and hm.auth_user_id = auth.uid())) with check (exists (select 1 from public.household_members hm where hm.household_id = household_settings.household_id and hm.auth_user_id = auth.uid()));

create policy "transactions_select_own_household" on public.transactions for select to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = transactions.household_id and hm.auth_user_id = auth.uid()));
create policy "transactions_insert_own_household" on public.transactions for insert to authenticated with check (exists (select 1 from public.household_members hm where hm.household_id = transactions.household_id and hm.auth_user_id = auth.uid()));
create policy "transactions_update_own_household" on public.transactions for update to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = transactions.household_id and hm.auth_user_id = auth.uid())) with check (exists (select 1 from public.household_members hm where hm.household_id = transactions.household_id and hm.auth_user_id = auth.uid()));
create policy "transactions_delete_own_household" on public.transactions for delete to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = transactions.household_id and hm.auth_user_id = auth.uid()));

create policy "categories_select_own_household" on public.categories for select to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = categories.household_id and hm.auth_user_id = auth.uid()));
create policy "categories_insert_own_household" on public.categories for insert to authenticated with check (exists (select 1 from public.household_members hm where hm.household_id = categories.household_id and hm.auth_user_id = auth.uid()));
create policy "categories_update_own_household" on public.categories for update to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = categories.household_id and hm.auth_user_id = auth.uid())) with check (exists (select 1 from public.household_members hm where hm.household_id = categories.household_id and hm.auth_user_id = auth.uid()));
create policy "categories_delete_own_household" on public.categories for delete to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = categories.household_id and hm.auth_user_id = auth.uid()));

create policy "category_limits_select_own_household" on public.category_limits for select to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = category_limits.household_id and hm.auth_user_id = auth.uid()));
create policy "category_limits_insert_own_household" on public.category_limits for insert to authenticated with check (exists (select 1 from public.household_members hm where hm.household_id = category_limits.household_id and hm.auth_user_id = auth.uid()));
create policy "category_limits_update_own_household" on public.category_limits for update to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = category_limits.household_id and hm.auth_user_id = auth.uid())) with check (exists (select 1 from public.household_members hm where hm.household_id = category_limits.household_id and hm.auth_user_id = auth.uid()));
create policy "category_limits_delete_own_household" on public.category_limits for delete to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = category_limits.household_id and hm.auth_user_id = auth.uid()));

create policy "budget_users_select_own_household" on public.budget_users for select to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = budget_users.household_id and hm.auth_user_id = auth.uid()));
create policy "budget_users_insert_own_household" on public.budget_users for insert to authenticated with check (exists (select 1 from public.household_members hm where hm.household_id = budget_users.household_id and hm.auth_user_id = auth.uid()));
create policy "budget_users_update_own_household" on public.budget_users for update to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = budget_users.household_id and hm.auth_user_id = auth.uid())) with check (exists (select 1 from public.household_members hm where hm.household_id = budget_users.household_id and hm.auth_user_id = auth.uid()));
create policy "budget_users_delete_own_household" on public.budget_users for delete to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = budget_users.household_id and hm.auth_user_id = auth.uid()));
