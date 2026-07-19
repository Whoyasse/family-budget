-- The server is the source of truth for whether a family completed setup.
-- Existing households predate this field, so treat them as already configured.
alter table public.household_settings
  add column if not exists onboarding_completed boolean not null default false;

update public.household_settings
set onboarding_completed = true
where onboarding_completed = false;
