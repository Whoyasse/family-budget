-- The server is the source of truth for whether a family completed setup.
alter table public.household_settings
  add column if not exists onboarding_completed boolean not null default false;
