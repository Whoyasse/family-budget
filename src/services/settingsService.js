import { supabase } from '../lib/supabase';
export async function loadHouseholdSettings(householdId) { const { data, error } = await supabase.from('household_settings').select('*').eq('household_id', householdId).maybeSingle(); if (error) throw error; return data; }
export async function saveHouseholdSettings(householdId, settings) { const { data, error } = await supabase.from('household_settings').upsert({ household_id: householdId, ...settings }, { onConflict: 'household_id' }).select('*').single(); if (error) throw error; return data; }
