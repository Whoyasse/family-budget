import { useMemo } from 'react';
import { getCategoryIcon } from '../data/categories';

function formatHistoryGroupLabel(dateValue) {
  const parsed = new Date(dateValue);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

  if (startOfDate.getTime() === startOfToday.getTime()) return 'Сегодня';
  if (startOfDate.getTime() === startOfYesterday.getTime()) return 'Вчера';

  return parsed.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function HistoryPage({
  transactions,
  searchValue,
  onSearchChange,
  onSelectTransaction,
  formatCurrency,
  formatTransactionDate,
  getCategoryIconValue
}) {
  const groupedTransactions = useMemo(() => {
    const groups = transactions.reduce((acc, transaction) => {
      const key = transaction.date ? new Date(transaction.date).toDateString() : 'unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([key, items]) => ({
        key,
        label: formatHistoryGroupLabel(items[0].date),
        transactions: items.sort((a, b) => new Date(b.date) - new Date(a.date))
      }))
      .sort((a, b) => new Date(b.transactions[0].date) - new Date(a.transactions[0].date));
  }, [transactions]);

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">История</p>
          <h2>История</h2>
        </div>
      </header>

      <section className="card">
        <label className="field">
          <span>Поиск</span>
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Категория или комментарий"
          />
        </label>
      </section>

      <div className="stack">
        {groupedTransactions.length === 0 ? (
          <section className="card placeholder-card">
            <h3>История пуста</h3>
            <p>Операции появятся здесь после добавления.</p>
          </section>
        ) : (
          groupedTransactions.map((group) => (
            <section key={group.key} className="card">
              <div className="section-title">
                <h4>{group.label}</h4>
                <span>{group.transactions.length}</span>
              </div>
              <div className="transaction-list">
                {group.transactions.map((transaction) => (
                  <button
                    key={`${transaction.id}-${transaction.date}-${transaction.time}`}
                    type="button"
                    className="transaction-item transaction-item--interactive"
                    onClick={() => onSelectTransaction(transaction)}
                  >
                    <div className="transaction-icon">
                      {transaction.type === 'Доход' ? '↗' : '↘'}
                    </div>
                    <div className="transaction-info">
                      <strong>{transaction.category}</strong>
                      <p>{transaction.person ? `• ${transaction.person}` : ''}</p>
                      <p className="transaction-comment">{transaction.comment || 'Без комментария'}</p>
                    </div>
                    <div className="transaction-meta">
                      <span className={`amount ${transaction.type === 'Доход' ? 'positive' : 'negative'}`}>
                        {transaction.type === 'Доход' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                      <p>{formatTransactionDate(transaction.date, transaction.time)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
