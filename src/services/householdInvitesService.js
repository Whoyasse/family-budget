import { supabase } from '../lib/supabase';
import { throwSupabaseError } from './supabaseError';
import { normalizeInviteCode } from '../utils/inviteCode';

export { normalizeInviteCode } from '../utils/inviteCode';

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throwSupabaseError(error, `household_invites.${name}`);
  return data;
}

export async function createHouseholdInvite() { return (await rpc('create_household_invite'))?.[0] || null; }
export async function acceptHouseholdInvite(code) { return (await rpc('accept_household_invite', { invite_code: normalizeInviteCode(code) }))?.[0] || null; }
export async function revokeHouseholdInvite(inviteId) { return rpc('revoke_household_invite', { invite_id: inviteId }); }
export async function getActiveHouseholdInvite() { return (await rpc('get_active_household_invite'))?.[0] || null; }
export async function getHouseholdAccessMembers() { return (await rpc('get_household_access_members')) || []; }
