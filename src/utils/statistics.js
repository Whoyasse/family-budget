export function calculateTotals(transactions) {
  return transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'Доход') {
        acc.income += transaction.amount;
      }
      if (transaction.type === 'Расход') {
        acc.expense += transaction.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );
}

export function calculateExpenseBreakdown(transactions) {
  const totals = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'Расход') {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
    }
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([category, sum]) => ({ category, sum }))
    .sort((a, b) => b.sum - a.sum);
}

export function calculateMonthlyTotals(transactions) {
  const grouped = transactions.reduce((acc, transaction) => {
    const monthKey = transaction.date ? `${new Date(transaction.date).getFullYear()}-${String(new Date(transaction.date).getMonth() + 1).padStart(2, '0')}` : '';
    if (!monthKey) return acc;
    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expense: 0 };
    }
    if (transaction.type === 'Доход') {
      acc[monthKey].income += transaction.amount;
    }
    if (transaction.type === 'Расход') {
      acc[monthKey].expense += transaction.amount;
    }
    return acc;
  }, {});

  return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
}
