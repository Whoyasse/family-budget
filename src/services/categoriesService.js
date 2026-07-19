import { supabase } from '../lib/supabase';
import { throwSupabaseError } from './supabaseError';

const mapCategory = (row) => ({
  id: row.id,
  name: row.name,
  label: row.name,
  icon: row.icon || '📦',
  color: row.color || '#94A3B8',
  type: row.type,
  archived: Boolean(row.archived_at),
  position: row.position ?? 0,
  previousNames: [row.name]
});

const fields = 'id,name,icon,color,type,position,archived_at';

export async function loadCategories(householdId) {
  const { data, error } = await supabase
    .from('categories')
    .select(fields)
    .eq('household_id', householdId)
    .order('position');
  if (error) throwSupabaseError(error, 'categories.load');
  return (data || []).map(mapCategory);
}

export async function createCategories(householdId, categories) {
  if (!categories.length) return [];
  const rows = categories.map((category, position) => ({
    household_id: householdId,
    name: category.name,
    icon: category.icon,
    color: category.color || '#94A3B8',
    type: category.type,
    position
  }));
  const { data, error } = await supabase.from('categories').insert(rows).select(fields);
  if (error) throwSupabaseError(error, 'categories.create');
  return (data || []).map(mapCategory);
}

export async function saveCategory(householdId, category) {
  const values = {
    household_id: householdId,
    name: category.name.trim(),
    icon: category.icon,
    color: category.color || '#94A3B8',
    type: category.type,
    position: category.position ?? 0
  };
  const isExistingRow = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(category.id || '');
  const query = isExistingRow
    ? supabase.from('categories').update(values).eq('id', category.id).eq('household_id', householdId)
    : supabase.from('categories').insert(values);
  const { data, error } = await query.select(fields).single();
  if (error) throwSupabaseError(error, 'categories.save');
  return mapCategory(data);
}

export async function deleteCategory(householdId, id) {
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('household_id', householdId);
  if (error) throwSupabaseError(error, 'categories.delete');
}

export async function loadCategoryLimits(householdId) {
  const { data, error } = await supabase
    .from('category_limits')
    .select('category_id,month_start,amount')
    .eq('household_id', householdId);
  if (error) throwSupabaseError(error, 'category_limits.load');
  return (data || []).reduce((limits, row) => {
    const current = limits[row.category_id] || { monthlyOverrides: {} };
    const monthStart = new Date(`${row.month_start}T00:00:00`);
    const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
    current.monthlyOverrides[monthKey] = Number(row.amount);
    limits[row.category_id] = current;
    return limits;
  }, {});
}

export async function saveCategoryLimit(householdId, categoryId, monthKey, value) {
  const amount = Number(String(value).replace(',', '.'));
  const monthStart = `${monthKey}-01`;
  const baseQuery = supabase.from('category_limits').delete().eq('household_id', householdId).eq('category_id', categoryId);
  const deleteQuery = baseQuery.eq('month_start', monthStart);
  if (!Number.isFinite(amount) || amount <= 0) {
    const { error } = await deleteQuery;
    if (error) throwSupabaseError(error, 'category_limits.delete');
    return null;
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throwSupabaseError(deleteError, 'category_limits.replace');
  const { data, error } = await supabase.from('category_limits').insert({
    household_id: householdId,
    category_id: categoryId,
    month_start: monthStart,
    amount
  }).select('category_id,month_start,amount').single();
  if (error) throwSupabaseError(error, 'category_limits.create');
  return data;
}
