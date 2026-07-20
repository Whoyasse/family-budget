-- Keep budget_users as the transaction subject, while optionally linking one
-- budget user to one auth account. Virtual members remain fully supported.
alter table public.budget_users add column if not exists auth_user_id uuid references auth.users(id) on delete restrict;
create unique index if not exists budget_users_auth_user_id_key on public.budget_users (auth_user_id) where auth_user_id is not null;
create unique index if not exists budget_users_household_auth_user_id_key on public.budget_users (household_id, auth_user_id) where auth_user_id is not null;

-- Existing data has no explicit link. Deterministically link the earliest budget
-- participant to the owner in each household before creating missing account rows.
with ranked_users as (
  select bu.id, bu.household_id, row_number() over (partition by bu.household_id order by bu.created_at, bu.id) as position
  from public.budget_users bu where bu.auth_user_id is null
), owners as (
  select hm.household_id, hm.auth_user_id from public.household_members hm where hm.role = 'owner'
)
update public.budget_users bu set auth_user_id = owners.auth_user_id
from ranked_users ru join owners on owners.household_id = ru.household_id
where bu.id = ru.id and ru.position = 1;

create or replace function public.ensure_linked_budget_user(target_household_id uuid, target_auth_user_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare budget_user_id uuid;
declare display_name text;
begin
  select bu.id into budget_user_id from public.budget_users bu where bu.auth_user_id = target_auth_user_id;
  if budget_user_id is not null then return budget_user_id; end if;
  select coalesce(nullif(au.raw_user_meta_data->>'name', ''), nullif(split_part(au.email, '@', 1), ''), 'Новый участник') into display_name from auth.users au where au.id = target_auth_user_id;
  insert into public.budget_users (household_id, auth_user_id, name, avatar)
  values (target_household_id, target_auth_user_id, coalesce(display_name, 'Новый участник'), '🧑')
  returning id into budget_user_id;
  return budget_user_id;
end;
$$;

-- Backfill one linked budget user for every existing family access account.
do $$
declare member_row record;
begin
  for member_row in select household_id, auth_user_id from public.household_members loop
    perform public.ensure_linked_budget_user(member_row.household_id, member_row.auth_user_id);
  end loop;
end $$;

create or replace function public.prevent_linked_budget_user_delete()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if old.auth_user_id is not null then raise exception 'linked_budget_user_cannot_be_deleted' using errcode = '23503'; end if;
  return old;
end;
$$;
drop trigger if exists budget_users_prevent_linked_delete on public.budget_users;
create trigger budget_users_prevent_linked_delete before delete on public.budget_users
for each row execute function public.prevent_linked_budget_user_delete();

-- New households and accepted invitations always gain a matching transaction participant.
create or replace function public.create_household(household_name text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare new_household_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if exists (select 1 from public.household_members hm where hm.auth_user_id = auth.uid()) then raise exception 'already_in_household' using errcode = '23505'; end if;
  insert into public.households (name) values (trim(household_name)) returning id into new_household_id;
  insert into public.household_members (household_id, auth_user_id, role) values (new_household_id, auth.uid(), 'owner');
  perform public.ensure_linked_budget_user(new_household_id, auth.uid());
  return new_household_id;
end;
$$;

create or replace function public.accept_household_invite(invite_code text)
returns table(household_id uuid)
language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare normalized_code text := public.normalize_household_invite_code(invite_code);
declare invite_hash text;
declare invite_row public.household_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if length(normalized_code) < 6 then raise exception 'invalid_invite_code' using errcode = '22023'; end if;
  if exists (select 1 from public.household_members hm where hm.auth_user_id = auth.uid()) then raise exception 'already_in_household' using errcode = '23505'; end if;
  invite_hash := encode(extensions.digest(normalized_code, 'sha256'), 'hex');
  select * into invite_row from public.household_invites hi where hi.code_hash = invite_hash for update;
  if not found then raise exception 'invalid_invite_code' using errcode = '22023'; end if;
  if invite_row.revoked_at is not null then raise exception 'invite_revoked' using errcode = '22023'; end if;
  if invite_row.used_at is not null then raise exception 'invite_used' using errcode = '22023'; end if;
  if invite_row.expires_at <= now() then raise exception 'invite_expired' using errcode = '22023'; end if;
  insert into public.household_members (household_id, auth_user_id, role) values (invite_row.household_id, auth.uid(), 'member');
  perform public.ensure_linked_budget_user(invite_row.household_id, auth.uid());
  update public.household_invites set used_at = now(), used_by = auth.uid() where id = invite_row.id;
  household_id := invite_row.household_id;
  return next;
end;
$$;

revoke all on function public.ensure_linked_budget_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
