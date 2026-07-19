import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonthKey } from '../src/utils/date.js';
import { calculateMonthlyTotals } from '../src/utils/statistics.js';
import { getMonthKeysEndingAt, getCategoryMonthlySeries } from '../src/utils/categoryAnalytics.js';

test('parses local dates into stable month keys', () => {
  assert.equal(getMonthKey('09.07.2026'), '2026-07');
  assert.equal(getMonthKey('2026-01-15'), '2026-01');
});

test('calculates monthly totals through a year boundary', () => {
  const totals = calculateMonthlyTotals([
    { date: '31.12.2025', type: 'Расход', amount: 12 },
    { date: '01.01.2026', type: 'Доход', amount: 20 }
  ]);
  assert.deepEqual(totals, [['2025-12', { income: 0, expense: 12 }], ['2026-01', { income: 20, expense: 0 }]]);
});

test('builds 12 calendar months ending with the selected month', () => {
  const months = getMonthKeysEndingAt('2026-01', 12);
  assert.equal(months[0], '2025-02');
  assert.equal(months.at(-1), '2026-01');
});

test('includes empty months in category series', () => {
  const series = getCategoryMonthlySeries([{ date: '2026-01-02', type: 'Расход', category: 'Продукты', amount: 10 }], 'Продукты', ['2025-12', '2026-01']);
  assert.deepEqual(series, [{ month: '2025-12', total: 0 }, { month: '2026-01', total: 10 }]);
});
