import { supabase } from '../lib/supabase';
import { throwSupabaseError } from './supabaseError';

export async function loadBudgetUsers(householdId) {
  const { data, error } = await supabase
    .from('budget_users')
    .select('id,name,avatar,auth_user_id,created_at')
    .eq('household_id', householdId)
    .order('created_at');
  if (error) throwSupabaseError(error, 'budget_users.load');
  return data || [];
}

export async function createBudgetUser(householdId, user) {
  const { data, error } = await supabase
    .from('budget_users')
    .insert({ household_id: householdId, name: user.name, avatar: user.avatar })
    .select('id,name,avatar,auth_user_id,created_at')
    .single();
  if (error) throwSupabaseError(error, 'budget_users.create');
  return data;
}

export async function updateBudgetUser(householdId, id, user) {
  const { data, error } = await supabase
    .from('budget_users')
    .update({ name: user.name, avatar: user.avatar })
    .eq('id', id)
    .eq('household_id', householdId)
    .select('id,name,avatar,auth_user_id,created_at')
    .single();
  if (error) throwSupabaseError(error, 'budget_users.update');
  return data;
}

export async function removeBudgetUser(householdId, id) {
  const { error } = await supabase.from('budget_users').delete().eq('id', id).eq('household_id', householdId);
  if (error) throwSupabaseError(error, 'budget_users.delete');
}
