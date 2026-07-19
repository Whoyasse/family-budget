import { getMonthKey, parseDate, parseTimeValue } from './date.js';

export function getMonthKeysEndingAt(monthKey, count) {
  const [year, month] = monthKey.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - 1 - (count - 1 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

export function getCategoryTransactions(transactions, category, monthKey) {
  return sortTransactionsNewestFirst(transactions
    .filter((transaction) => transaction.type === 'Расход' && transaction.category === category && getMonthKey(transaction.date) === monthKey)
  );
}

export function getCategoryHistoryTransactions(transactions, category) {
  return sortTransactionsNewestFirst(transactions.filter((transaction) => transaction.type === 'Расход' && transaction.category === category));
}

export function getAllTimeCategoryStats(transactions, category) {
  const history = getCategoryHistoryTransactions(transactions, category);
  const total = history.reduce((sum, transaction) => sum + transaction.amount, 0);
  return {
    total,
    count: history.length,
    averageAmount: history.length ? total / history.length : 0,
    lastTransaction: history[0] || null,
    largestTransaction: history.slice().sort((a, b) => b.amount - a.amount)[0] || null,
    history
  };
}

export function getCategoryMonthlySeries(transactions, category, monthKeys) {
  const totals = transactions.reduce((acc, transaction) => {
    if (transaction.type !== 'Расход' || transaction.category !== category) return acc;
    const key = getMonthKey(transaction.date);
    if (monthKeys.includes(key)) acc[key] = (acc[key] || 0) + transaction.amount;
    return acc;
  }, {});

  return monthKeys.map((month) => ({ month, total: totals[month] || 0 }));
}

export function sumMonthlySeries(series) {
  return series.reduce((sum, item) => sum + item.total, 0);
}

function getTransactionTimestamp(transaction) {
  const date = parseDate(transaction.date);
  if (!date) return Number.NEGATIVE_INFINITY;
  const time = parseTimeValue(transaction.time);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time?.getHours() ?? 0,
    time?.getMinutes() ?? 0,
    time?.getSeconds() ?? 0,
    time?.getMilliseconds() ?? 0
  ).getTime();
}

function sortTransactionsNewestFirst(transactions) {
  return transactions.slice().sort((a, b) => getTransactionTimestamp(b) - getTransactionTimestamp(a));
}
