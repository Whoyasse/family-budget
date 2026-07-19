import { expenseCategories, incomeCategories } from '../data/categories';

const CATEGORY_KEY = 'family-budget-categories';
const BUDGET_KEY = 'family-budget-category-budgets';

const slugify = (value) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/(^-|-$)/g, '') || 'custom';

export function createDefaultCategories() {
  return [
    ...expenseCategories.map((category) => ({ ...category, id: `expense-${slugify(category.label)}`, type: 'expense' })),
    ...incomeCategories.map((category) => ({ ...category, id: `income-${slugify(category.label)}`, type: 'income' }))
  ].map((category) => ({ ...category, name: category.label, archived: false, previousNames: [category.label], createdAt: new Date().toISOString() }));
}

export function normalizeCategory(category) {
  const names = Array.from(new Set([...(category?.previousNames || []), category?.name || category?.label].filter(Boolean)));
  const name = category?.name || category?.label || '';
  return {
    id: category?.id || `${category?.type || 'expense'}-${slugify(name)}-${Date.now()}`,
    name,
    label: name,
    icon: category?.icon || '📦',
    color: category?.color || '#94A3B8',
    type: category?.type === 'income' || category?.type === 'Доход' ? 'income' : 'expense',
    archived: Boolean(category?.archived),
    previousNames: Array.from(new Set([...names, name])),
    createdAt: category?.createdAt || new Date().toISOString()
  };
}

export function loadCategories() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CATEGORY_KEY) || '[]');
    return Array.isArray(stored) && stored.length ? stored.map(normalizeCategory) : createDefaultCategories();
  } catch {
    return createDefaultCategories();
  }
}

export function persistCategories(categories) {
  window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories.map(normalizeCategory)));
}

export function getCategoryNames(category) {
  return new Set([category?.name, category?.label, ...(category?.previousNames || [])].filter(Boolean));
}

export function findCategory(categories, transactionCategory) {
  return categories.find((category) => getCategoryNames(category).has(transactionCategory));
}

export function loadCategoryBudgets() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(BUDGET_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch { return {}; }
}

export function persistCategoryBudgets(budgets) {
  window.localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

export function getCategoryLimit(budgets, categoryId, monthKey) {
  const entry = budgets?.[categoryId];
  if (!entry) return null;
  const value = entry.monthlyOverrides?.[monthKey] ?? entry.defaultLimit;
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
}

export function setCategoryMonthLimit(budgets, categoryId, monthKey, value) {
  const parsed = Number(String(value).replace(',', '.'));
  const next = { ...budgets };
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (next[categoryId]?.monthlyOverrides) {
      const monthlyOverrides = { ...next[categoryId].monthlyOverrides };
      delete monthlyOverrides[monthKey];
      next[categoryId] = { ...next[categoryId], monthlyOverrides };
    }
    return next;
  }
  next[categoryId] = { ...(next[categoryId] || {}), monthlyOverrides: { ...(next[categoryId]?.monthlyOverrides || {}), [monthKey]: parsed } };
  return next;
}

export function setCategoryDefaultLimit(budgets, categoryId, value) {
  const parsed = Number(String(value).replace(',', '.'));
  const next = { ...budgets };
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (next[categoryId]) {
      const { defaultLimit, ...rest } = next[categoryId];
      next[categoryId] = rest;
    }
    return next;
  }
  next[categoryId] = { ...(next[categoryId] || {}), defaultLimit: parsed };
  return next;
}
