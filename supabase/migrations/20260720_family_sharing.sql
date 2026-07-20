-- Family sharing: one active household per auth account, owner/member roles and
-- single-use hashed invite codes. Run this migration in the Supabase SQL Editor.
create extension if not exists pgcrypto;

alter table public.household_members
  add column if not exists role text not null default 'member';

alter table public.household_members
  drop constraint if exists household_members_role_check;
alter table public.household_members
  add constraint household_members_role_check check (role in ('owner', 'member'));

-- Existing data has no creator column in this project. The earliest membership in
-- every family is therefore the deterministic owner; all other members are members.
with ranked_members as (
  select ctid, row_number() over (partition by household_id order by ctid) as position
  from public.household_members
)
update public.household_members hm
set role = case when ranked_members.position = 1 then 'owner' else 'member' end
from ranked_members
where ranked_members.ctid = hm.ctid;

create unique index if not exists household_members_one_household_per_auth_user
  on public.household_members (auth_user_id);
create unique index if not exists household_members_one_owner_membership
  on public.household_members (household_id, auth_user_id);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code_hash text not null,
  code_hint text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  constraint household_invites_expiry_after_creation check (expires_at > created_at)
);
create unique index if not exists household_invites_active_code_hash_key
  on public.household_invites (code_hash)
  where used_at is null and revoked_at is null;
create index if not exists household_invites_household_active_idx
  on public.household_invites (household_id, expires_at desc)
  where used_at is null and revoked_at is null;

alter table public.household_invites enable row level security;
revoke all on table public.household_invites from anon, authenticated;

create or replace function public.normalize_household_invite_code(invite_code text)
returns text language sql immutable strict set search_path = pg_catalog, public as $$
  select upper(regexp_replace(invite_code, '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.create_household_invite()
returns table(invite_id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  current_household uuid;
  generated_code text;
  generated_hash text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea;
  i integer;
begin
  select hm.household_id into current_household
  from public.household_members hm
  where hm.auth_user_id = auth.uid() and hm.role = 'owner';
  if current_household is null then raise exception 'not_household_owner' using errcode = '42501'; end if;

  update public.household_invites set revoked_at = now()
  where household_id = current_household and used_at is null and revoked_at is null and expires_at > now();

  raw := gen_random_bytes(8); generated_code := '';
  for i in 0..7 loop generated_code := generated_code || substr(alphabet, (get_byte(raw, i) % length(alphabet)) + 1, 1); end loop;
  generated_code := substr(generated_code, 1, 4) || '-' || substr(generated_code, 5, 4);
  generated_hash := encode(digest(public.normalize_household_invite_code(generated_code), 'sha256'), 'hex');

  insert into public.household_invites (household_id, code_hash, code_hint, created_by, expires_at)
  values (current_household, generated_hash, right(public.normalize_household_invite_code(generated_code), 2), auth.uid(), now() + interval '24 hours')
  returning id, public.household_invites.expires_at into invite_id, expires_at;
  code := generated_code;
  return next;
end;
$$;

create or replace function public.accept_household_invite(invite_code text)
returns table(household_id uuid)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  normalized_code text := public.normalize_household_invite_code(invite_code);
  invite_hash text;
  invite_row public.household_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if length(normalized_code) < 6 then raise exception 'invalid_invite_code' using errcode = '22023'; end if;
  if exists (select 1 from public.household_members hm where hm.auth_user_id = auth.uid()) then raise exception 'already_in_household' using errcode = '23505'; end if;
  invite_hash := encode(digest(normalized_code, 'sha256'), 'hex');
  select * into invite_row from public.household_invites hi where hi.code_hash = invite_hash for update;
  if not found then raise exception 'invalid_invite_code' using errcode = '22023'; end if;
  if invite_row.revoked_at is not null then raise exception 'invite_revoked' using errcode = '22023'; end if;
  if invite_row.used_at is not null then raise exception 'invite_used' using errcode = '22023'; end if;
  if invite_row.expires_at <= now() then raise exception 'invite_expired' using errcode = '22023'; end if;
  insert into public.household_members (household_id, auth_user_id, role) values (invite_row.household_id, auth.uid(), 'member');
  update public.household_invites set used_at = now(), used_by = auth.uid() where id = invite_row.id;
  household_id := invite_row.household_id;
  return next;
end;
$$;

create or replace function public.revoke_household_invite(invite_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.household_invites hi set revoked_at = now()
  where hi.id = invite_id and hi.used_at is null and hi.revoked_at is null
    and exists (select 1 from public.household_members hm where hm.household_id = hi.household_id and hm.auth_user_id = auth.uid() and hm.role = 'owner');
  if not found then raise exception 'invite_not_found_or_not_owner' using errcode = '42501'; end if;
end;
$$;

create or replace function public.get_active_household_invite()
returns table(invite_id uuid, expires_at timestamptz, created_at timestamptz, is_active boolean, code_hint text)
language sql security definer set search_path = pg_catalog, public as $$
  select hi.id, hi.expires_at, hi.created_at, (hi.expires_at > now() and hi.used_at is null and hi.revoked_at is null), hi.code_hint
  from public.household_invites hi
  join public.household_members hm on hm.household_id = hi.household_id
  where hm.auth_user_id = auth.uid() and hm.role = 'owner' and hi.used_at is null and hi.revoked_at is null
  order by hi.created_at desc limit 1;
$$;

create or replace function public.get_household_access_members()
returns table(auth_user_id uuid, role text, is_current boolean)
language sql security definer set search_path = pg_catalog, public as $$
  select hm.auth_user_id, hm.role, hm.auth_user_id = auth.uid()
  from public.household_members hm
  where hm.household_id = (select own.household_id from public.household_members own where own.auth_user_id = auth.uid())
  order by case hm.role when 'owner' then 0 else 1 end, hm.auth_user_id;
$$;

-- Create-family RPC is replaced so newly created households always have an owner.
create or replace function public.create_household(household_name text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare new_household_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if exists (select 1 from public.household_members hm where hm.auth_user_id = auth.uid()) then raise exception 'already_in_household' using errcode = '23505'; end if;
  insert into public.households (name) values (trim(household_name)) returning id into new_household_id;
  insert into public.household_members (household_id, auth_user_id, role) values (new_household_id, auth.uid(), 'owner');
  return new_household_id;
end;
$$;

revoke all on function public.create_household_invite() from public, anon;
revoke all on function public.accept_household_invite(text) from public, anon;
revoke all on function public.revoke_household_invite(uuid) from public, anon;
revoke all on function public.get_active_household_invite() from public, anon;
revoke all on function public.get_household_access_members() from public, anon;
revoke all on function public.create_household(text) from public, anon;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.revoke_household_invite(uuid) to authenticated;
grant execute on function public.get_active_household_invite() to authenticated;
grant execute on function public.get_household_access_members() to authenticated;
grant execute on function public.create_household(text) to authenticated;
