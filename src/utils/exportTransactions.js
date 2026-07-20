export async function exportTransactionsToXlsx(transactions, monthlyTotals) {
  const XLSX = await import('xlsx');
  const rows = transactions.map((transaction) => ({
    ID: transaction.id,
    Date: transaction.date,
    Time: transaction.time,
    Person: transaction.person,
    Type: transaction.type,
    Category: transaction.category,
    Amount: transaction.amount,
    Comment: transaction.comment
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: ['ID', 'Date', 'Time', 'Person', 'Type', 'Category', 'Amount', 'Comment'] }), 'Операции');
  const summaryRows = monthlyTotals.map(([month, totals]) => ({ Month: month, Income: totals.income, Expense: totals.expense, Balance: totals.income - totals.expense }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows, { header: ['Month', 'Income', 'Expense', 'Balance'] }), 'По месяцам');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `family-budget-${date}.xlsx`);
}
