import { supabase } from '../lib/supabase';

const mapTransaction = (row) => {
  const occurredAt = new Date(row.occurred_at);
  return { id: row.id, person: row.budget_users?.name || '', category: row.categories?.name || '', type: row.type, amount: Number(row.amount || 0), comment: row.comment || '', date: occurredAt.toLocaleDateString('ru-RU'), time: occurredAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) };
};
export async function loadTransactions(householdId) {
  const { data, error } = await supabase.from('transactions').select('id,type,amount,comment,occurred_at,budget_users(name),categories(name)').eq('household_id', householdId).order('occurred_at', { ascending: false });
  if (error) throw error; return (data || []).map(mapTransaction);
}
export async function createTransaction(householdId, payload) {
  const { data, error } = await supabase.from('transactions').insert({ household_id: householdId, budget_user_id: payload.userId, category_id: payload.categoryId, type: payload.type, amount: payload.amount, comment: payload.comment || '', occurred_at: payload.occurredAt }).select('id,type,amount,comment,occurred_at,budget_users(name),categories(name)').single();
  if (error) throw error; return mapTransaction(data);
}
export async function updateTransaction(householdId, id, payload) {
  const { data, error } = await supabase.from('transactions').update({ budget_user_id: payload.userId, category_id: payload.categoryId, type: payload.type, amount: payload.amount, comment: payload.comment || '', occurred_at: payload.occurredAt }).eq('id', id).eq('household_id', householdId).select('id,type,amount,comment,occurred_at,budget_users(name),categories(name)').single();
  if (error) throw error; return mapTransaction(data);
}
export async function deleteTransaction(householdId, id) { const { error } = await supabase.from('transactions').delete().eq('id', id).eq('household_id', householdId); if (error) throw error; }
