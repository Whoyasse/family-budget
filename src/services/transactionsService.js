import { supabase } from '../lib/supabase';
import { throwSupabaseError } from './supabaseError';
import { normalizeTransactionComment } from '../utils/transactionComment';

const toDatabaseType = (type) => type === 'Расход' ? 'expense' : 'income';
const toDisplayType = (type) => type === 'expense' ? 'Расход' : type === 'income' ? 'Доход' : type;
const transactionDateFields = (occurredAt) => {
  const date = new Date(occurredAt);
  const pad = (value) => String(value).padStart(2, '0');
  return {
    occurred_at: date.toISOString(),
    transaction_date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    transaction_time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  };
};

const mapTransaction = (row) => {
  const occurredAt = new Date(row.occurred_at);
  return { id: row.id, person: row.budget_users?.name || '', category: row.categories?.name || '', type: toDisplayType(row.type), amount: Number(row.amount || 0), comment: normalizeTransactionComment(row.comment), date: occurredAt.toLocaleDateString('ru-RU'), time: occurredAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) };
};
export async function loadTransactions(householdId) {
  const { data, error } = await supabase.from('transactions').select('id,type,amount,comment,occurred_at,budget_users(name),categories(name)').eq('household_id', householdId).order('occurred_at', { ascending: false });
  if (error) throwSupabaseError(error, 'transactions.load');
  return (data || []).map(mapTransaction);
}
export async function createTransaction(householdId, payload) {
  const { data, error } = await supabase.from('transactions').insert({ household_id: householdId, created_by: payload.createdBy, budget_user_id: payload.userId, category_id: payload.categoryId, type: toDatabaseType(payload.type), amount: payload.amount, comment: normalizeTransactionComment(payload.comment), ...transactionDateFields(payload.occurredAt) }).select('id,type,amount,comment,occurred_at,budget_users(name),categories(name)').single();
  if (error) throwSupabaseError(error, 'transactions.create');
  return mapTransaction(data);
}
export async function updateTransaction(householdId, id, payload) {
  const { data, error } = await supabase.from('transactions').update({ budget_user_id: payload.userId, category_id: payload.categoryId, type: toDatabaseType(payload.type), amount: payload.amount, comment: normalizeTransactionComment(payload.comment), ...transactionDateFields(payload.occurredAt) }).eq('id', id).eq('household_id', householdId).select('id,type,amount,comment,occurred_at,budget_users(name),categories(name)').single();
  if (error) throwSupabaseError(error, 'transactions.update');
  return mapTransaction(data);
}
export async function deleteTransaction(householdId, id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('household_id', householdId);
  if (error) throwSupabaseError(error, 'transactions.delete');
}
