import { getMonthKey, parseDate } from './date.js';
import { calculateTotals } from './statistics.js';

export const ANALYTICS_PERIODS = [
  { id: 'current', label: 'Этот месяц', months: 1 },
  { id: 'previous', label: 'Прошлый месяц', months: 1, offset: 1 },
  { id: 'three', label: '3 месяца', months: 3 },
  { id: 'six', label: '6 месяцев', months: 6 },
  { id: 'year', label: 'Год', months: 12 }
];

const monthDate = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
};
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const shiftMonth = (key, delta) => {
  const date = monthDate(key);
  date.setMonth(date.getMonth() + delta);
  return monthKey(date);
};

export function getAnalyticsRange(selectedMonth, periodId = 'current') {
  const period = ANALYTICS_PERIODS.find((item) => item.id === periodId) || ANALYTICS_PERIODS[0];
  const end = shiftMonth(selectedMonth, -(period.offset || 0));
  const start = shiftMonth(end, -(period.months - 1));
  return { id: period.id, start, end, months: period.months };
}

export function filterAnalyticsPeriod(transactions, range) {
  return transactions.filter((transaction) => {
    const key = getMonthKey(transaction.date);
    return key && key >= range.start && key <= range.end;
  });
}

export function getPreviousAnalyticsRange(range) {
  return { ...range, start: shiftMonth(range.start, -range.months), end: shiftMonth(range.end, -range.months) };
}

export function getComparison(current, previous) {
  const compare = (key) => {
    const change = current[key] - previous[key];
    return { value: current[key], previous: previous[key], change, percent: previous[key] ? change / Math.abs(previous[key]) * 100 : null };
  };
  return { income: compare('income'), expense: compare('expense'), balance: compare('balance') };
}

export function getDailySeries(transactions, range) {
  const start = monthDate(range.start);
  const endMonth = monthDate(range.end);
  const end = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0);
  const days = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    days.push({ key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, label: String(date.getDate()), income: 0, expense: 0 });
  }
  const byKey = new Map(days.map((day) => [day.key, day]));
  transactions.forEach((transaction) => {
    const date = parseDate(transaction.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const item = byKey.get(key);
    if (item) item[transaction.type === 'Доход' ? 'income' : 'expense'] += Number(transaction.amount || 0);
  });
  return days;
}

export function getMonthlySeries(transactions, range) {
  const result = [];
  for (let key = range.start; key <= range.end; key = shiftMonth(key, 1)) result.push({ key, income: 0, expense: 0 });
  const byKey = new Map(result.map((item) => [item.key, item]));
  transactions.forEach((transaction) => {
    const item = byKey.get(getMonthKey(transaction.date));
    if (item) item[transaction.type === 'Доход' ? 'income' : 'expense'] += Number(transaction.amount || 0);
  });
  return result;
}

export function getCategoryAnalytics(transactions) {
  const totals = new Map();
  transactions.filter((item) => item.type === 'Расход').forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + Number(item.amount || 0)));
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()].map(([category, amount]) => ({ category, amount, percent: total ? amount / total * 100 : 0 })).sort((a, b) => b.amount - a.amount);
}

export function getTopTransactions(transactions, limit = 5) {
  return transactions.filter((item) => item.type === 'Расход').slice().sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, limit);
}

export function getUserExpenses(transactions, users) {
  const total = transactions.filter((item) => item.type === 'Расход').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return users.map((user) => {
    const items = transactions.filter((item) => item.type === 'Расход' && item.person === user.name);
    const amount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { user, amount, count: items.length, percent: total ? amount / total * 100 : 0 };
  }).filter((item) => item.count).sort((a, b) => b.amount - a.amount);
}

export function getExpenseAverages(transactions, range) {
  const expenses = transactions.filter((item) => item.type === 'Расход');
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const start = monthDate(range.start);
  const endMonth = monthDate(range.end);
  const calendarDays = Math.round((new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0) - start) / 86400000) + 1;
  const daysWithExpenses = new Set(expenses.map((item) => {
    const date = parseDate(item.date);
    return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';
  }).filter(Boolean)).size;
  return { perCalendarDay: calendarDays ? total / calendarDays : 0, perSpendingDay: daysWithExpenses ? total / daysWithExpenses : 0, perOperation: expenses.length ? total / expenses.length : 0 };
}

export function getMostExpensiveDay(transactions) {
  const days = new Map();
  transactions.filter((item) => item.type === 'Расход').forEach((item) => {
    const date = parseDate(item.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const current = days.get(key) || { date: item.date, amount: 0, count: 0, categories: new Map() };
    current.amount += Number(item.amount || 0); current.count += 1;
    current.categories.set(item.category, (current.categories.get(item.category) || 0) + Number(item.amount || 0));
    days.set(key, current);
  });
  const [key, result] = [...days.entries()].sort((a, b) => b[1].amount - a[1].amount)[0] || [];
  if (!result) return null;
  return { key, ...result, category: [...result.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '' };
}

export function getMonthForecast(transactions, selectedMonth, today = new Date()) {
  const currentKey = monthKey(today);
  if (selectedMonth !== currentKey) return null;
  const elapsed = today.getDate();
  const expenses = transactions.filter((item) => item.type === 'Расход').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (elapsed < 2 || !expenses) return null;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return { spent: expenses, projected: expenses / elapsed * daysInMonth, elapsed, daysInMonth };
}

export function getAnalyticsSummary(transactions) {
  const totals = calculateTotals(transactions);
  return { ...totals, balance: totals.income - totals.expense, count: transactions.length };
}
