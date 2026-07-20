import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAnalyticsPeriod, getAnalyticsRange, getAnalyticsSummary, getCategoryAnalytics, getDailySeries,
  getExpenseAverages, getMonthForecast, getMonthlySeries, getMostExpensiveDay, getPreviousAnalyticsRange,
  getTopTransactions, getUserExpenses
} from '../src/utils/analytics.js';

const transactions = [
  { id: '1', date: '2026-07-01', type: 'Расход', category: 'Продукты', person: 'Ида', amount: 20 },
  { id: '2', date: '2026-07-02', type: 'Доход', category: 'Зарплата', person: 'Дима', amount: 100 },
  { id: '3', date: '2026-07-02', type: 'Расход', category: 'Топливо', person: 'Дима', amount: 50 },
  { id: '4', date: '2026-06-30', type: 'Расход', category: 'Продукты', person: 'Ида', amount: 10 }
];

test('filters selected calendar month and handles the boundary day', () => {
  const range = getAnalyticsRange('2026-07', 'current');
  assert.deepEqual(filterAnalyticsPeriod(transactions, range).map((item) => item.id), ['1', '2', '3']);
  assert.deepEqual(getPreviousAnalyticsRange(range), { id: 'current', start: '2026-06', end: '2026-06', months: 1 });
});

test('aggregates income expense and balance', () => {
  assert.deepEqual(getAnalyticsSummary(filterAnalyticsPeriod(transactions, getAnalyticsRange('2026-07'))), { income: 100, expense: 70, balance: 30, count: 3 });
});

test('builds daily and monthly series with zero intervals', () => {
  const daily = getDailySeries(filterAnalyticsPeriod(transactions, getAnalyticsRange('2026-07')), getAnalyticsRange('2026-07'));
  assert.equal(daily.length, 31);
  assert.equal(daily[2].expense, 0);
  const monthly = getMonthlySeries(transactions, getAnalyticsRange('2026-07', 'three'));
  assert.deepEqual(monthly.map((item) => item.key), ['2026-05', '2026-06', '2026-07']);
});

test('calculates categories top operations users averages and expensive day', () => {
  const july = filterAnalyticsPeriod(transactions, getAnalyticsRange('2026-07'));
  assert.equal(getCategoryAnalytics(july)[0].category, 'Топливо');
  assert.equal(getTopTransactions(july)[0].id, '3');
  assert.equal(getUserExpenses(july, [{ id: 'd', name: 'Дима' }, { id: 'i', name: 'Ида' }])[0].user.name, 'Дима');
  assert.equal(getExpenseAverages(july, getAnalyticsRange('2026-07')).perOperation, 35);
  assert.equal(getMostExpensiveDay(july).key, '2026-07-02');
});

test('returns compact participant expense data and omits users without expenses', () => {
  const july = filterAnalyticsPeriod(transactions, getAnalyticsRange('2026-07'));
  const rows = getUserExpenses(july, [
    { id: 'd', name: 'Дима', avatar: '👨' },
    { id: 'i', name: 'Ида', avatar: '👩' },
    { id: 'empty', name: 'Очень длинное имя без операций', avatar: '🧑' }
  ]);

  assert.deepEqual(rows.map(({ user, amount, count, percent }) => ({ name: user.name, amount, count, percent: Math.round(percent) })), [
    { name: 'Дима', amount: 50, count: 1, percent: 71 },
    { name: 'Ида', amount: 20, count: 1, percent: 29 }
  ]);
  assert.deepEqual(getUserExpenses([], [{ id: 'd', name: 'Дима' }]), []);
});

test('returns no forecast with insufficient data and avoids division by zero', () => {
  assert.equal(getMonthForecast([], '2026-07', new Date(2026, 6, 1)), null);
  assert.deepEqual(getExpenseAverages([], getAnalyticsRange('2026-07')), { perCalendarDay: 0, perSpendingDay: 0, perOperation: 0 });
});
