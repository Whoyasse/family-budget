import { parseDate, parseTimeValue } from './date';

function timestamp(transaction) {
  const date = parseDate(transaction.date); const time = parseTimeValue(transaction.time);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), time?.getHours() || 0, time?.getMinutes() || 0).getTime() : 0;
}

export function getBalancePoints(transactions, startBalance) {
  let balance = Number(startBalance || 0);
  return [...transactions].sort((a, b) => timestamp(a) - timestamp(b)).map((transaction) => {
    balance += transaction.type === 'Доход' ? transaction.amount : -transaction.amount;
    return { timestamp: timestamp(transaction), balance };
  });
}

export function getBalancePeriod(points, period) {
  if (!points.length) return [{ timestamp: Date.now(), balance: 0 }];
  if (period === 'week') return points.slice(-7);
  if (period === 'month') return points.slice(-31);
  if (period === 'year') return points.slice(-12);
  return points;
}

export function getBalanceStats(points) {
  const values = points.map((point) => point.balance);
  return { current: values.at(-1) || 0, highest: Math.max(...values, 0), lowest: Math.min(...values, 0), average: values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1), change: (values.at(-1) || 0) - (values[0] || 0) };
}
