-- household_members uses auth_user_id in this schema.
-- Keep the settings row scoped to the household of the signed-in user.

alter table public.household_settings enable row level security;

drop policy if exists "household_settings_select_own_household" on public.household_settings;
drop policy if exists "household_settings_insert_own_household" on public.household_settings;
drop policy if exists "household_settings_update_own_household" on public.household_settings;

create policy "household_settings_select_own_household"
on public.household_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_settings.household_id
      and hm.auth_user_id = auth.uid()
  )
);

create policy "household_settings_insert_own_household"
on public.household_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_settings.household_id
      and hm.auth_user_id = auth.uid()
  )
);

create policy "household_settings_update_own_household"
on public.household_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_settings.household_id
      and hm.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = household_settings.household_id
      and hm.auth_user_id = auth.uid()
  )
);
