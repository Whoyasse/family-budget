import { useEffect, useMemo, useState } from 'react';
import { parseDate, parseTimeValue } from '../utils/date';
import { getBalancePeriod } from '../utils/balanceHistory';
import BalanceSparkline from '../components/BalanceSparkline';

function getTransactionTimestamp(transaction) {
  const date = parseDate(transaction.date);
  if (!date) return Number.NEGATIVE_INFINITY;

  const time = parseTimeValue(transaction.time);
  const hours = time?.getHours() ?? 0;
  const minutes = time?.getMinutes() ?? 0;
  const seconds = time?.getSeconds() ?? 0;
  const milliseconds = time?.getMilliseconds() ?? 0;

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
    milliseconds
  ).getTime();
}

function HomePage({
  currentBalance,
  selectedMonth,
  availableMonths,
  totalIncome,
  totalExpense,
  monthlyBalanceChange,
  balancePoints = [],
  expenseBreakdown,
  categoryBudgets = [],
  filteredTransactions,
  formatCurrency,
  formatTransactionDate,
  getMonthLabel,
  onMonthChange,
  onOpenTransactionDetails,
  onOpenCategory,
  onOpenLimit,
  onOpenBalance,
  onAddTransaction,
  loading = false
}) {
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [balancePeriod, setBalancePeriod] = useState('month');
  const sortedTransactions = useMemo(
    () => filteredTransactions
      .map((transaction, index) => ({ transaction, index }))
      .sort((a, b) => {
        const timeDifference = getTransactionTimestamp(b.transaction) - getTransactionTimestamp(a.transaction);
        return timeDifference || b.index - a.index;
      })
      .map(({ transaction }) => transaction),
    [filteredTransactions]
  );
  const visibleTransactions = showAllTransactions ? sortedTransactions : sortedTransactions.slice(0, 3);

  useEffect(() => {
    setShowAllTransactions(false);
  }, [selectedMonth]);

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Семейный бюджет</p>
          <h2>Обзор</h2>
        </div>
      </header>

      <section className="card balance-card balance-card--interactive" role="button" tabIndex="0" onClick={onOpenBalance} onKeyDown={(event) => event.key === 'Enter' && onOpenBalance()}>
        <div className="balance-row">
          <div>
            <p className="eyebrow">Общий баланс</p>
            <h3 className={currentBalance < 0 ? 'negative' : ''}>{loading ? <span className="skeleton skeleton-text skeleton-text--large" /> : formatCurrency(currentBalance)}</h3>
            <p className={`balance-change ${monthlyBalanceChange >= 0 ? 'positive' : 'negative'}`}>{monthlyBalanceChange >= 0 ? '▲' : '▼'} {monthlyBalanceChange >= 0 ? '+' : ''}{formatCurrency(monthlyBalanceChange)} за выбранный месяц</p>
          </div>
        </div>
        <div className="balance-period-control" onClick={(event) => event.stopPropagation()}>{[['week','Неделя'], ['month','Месяц'], ['year','Год']].map(([id,label]) => <button key={id} type="button" className={balancePeriod === id ? 'active' : ''} onClick={() => setBalancePeriod(id)}>{label}</button>)}</div>
        <BalanceSparkline points={getBalancePeriod(balancePoints, balancePeriod)} />
        <div className="pill-row">
          <label className="pill-select">
            <span>Месяц</span>
            <select value={selectedMonth} onClick={(event) => event.stopPropagation()} onChange={(event) => onMonthChange(event.target.value)}>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="summary-grid">
        <div className="card summary-card income">
          <p>Доход</p>
          <strong>{formatCurrency(totalIncome)}</strong>
        </div>
        <div className="card summary-card expense">
          <p>Расход</p>
          <strong>{formatCurrency(totalExpense)}</strong>
        </div>
      </section>

      <section className="card">
        <div className="section-title home-expense-heading">
          <h4>Лимиты на этот месяц</h4>
          <span>{categoryBudgets.length}</span>
        </div>
        {loading ? <div className="skeleton-stack"><span className="skeleton skeleton-row" /><span className="skeleton skeleton-row" /></div> : categoryBudgets.length === 0 ? (
          <div className="empty-state compact-empty"><span aria-hidden="true">🎯</span><strong>Лимиты пока не установлены</strong><p>Выберите категорию и задайте лимит на этот месяц.</p><button className="text-action" type="button" onClick={onOpenBalance}>Настроить лимиты</button></div>
        ) : (
          categoryBudgets.map((item) => (
            <button key={item.id} type="button" className={`progress-row category-link-row budget-row ${item.limit && item.percent >= 100 ? 'is-exceeded' : item.limit && item.percent >= 80 ? 'is-warning' : ''}`} onClick={() => onOpenLimit(item)}>
              <div className="progress-label">
                <span>{item.icon} {item.name}</span>
                <strong>{formatCurrency(item.spent)}{item.limit ? ` / ${formatCurrency(item.limit)}` : ''}</strong>
              </div>
              <small>{item.limit ? (item.percent >= 100 ? `Превышение на ${formatCurrency(item.spent - item.limit)}` : `Осталось ${formatCurrency(item.limit - item.spent)}`) : '+ Установить лимит'}</small>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${item.limit ? Math.min(100, item.percent) : 0}%` }}
                />
              </div>
            </button>
          ))
        )}
      </section>

      <section className="card">
        <div className="section-title">
          <h4>Последние операции</h4>
        </div>
        {!loading ? <p className="latest-operations-count">Показано {visibleTransactions.length} из {sortedTransactions.length}</p> : null}
        {loading ? <div className="skeleton-stack"><span className="skeleton skeleton-row" /><span className="skeleton skeleton-row" /><span className="skeleton skeleton-row" /></div> : filteredTransactions.length === 0 ? (
          <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">🧾</span><strong>Операций пока нет</strong><p>Добавьте первую операцию — здесь появится история за выбранный месяц.</p><button className="primary-btn" type="button" onClick={onAddTransaction}>Добавить первую операцию</button></div>
        ) : (
          <div className="transaction-list">
            {visibleTransactions.map((transaction) => (
                <button
                  key={`${transaction.id}-${transaction.date}-${transaction.time}`}
                  type="button"
                  className="transaction-item transaction-item--interactive"
                  onClick={() => onOpenTransactionDetails(transaction)}
                >
                  <div className="transaction-icon">
                    {transaction.type === 'Доход' ? '↗' : '↘'}
                  </div>
                  <div className="transaction-info">
                    <strong>{transaction.category}</strong>
                    <p>{transaction.person ? `• ${transaction.person}` : ''}</p>
                    {transaction.comment ? <p className="transaction-comment">{transaction.comment}</p> : null}
                  </div>
                  <div className="transaction-meta">
                    <span className={`amount ${transaction.type === 'Доход' ? 'positive' : 'negative'}`}>
                      {transaction.type === 'Доход' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                    <p>{formatTransactionDate(transaction.date, transaction.time)}</p>
                  </div>
                </button>
              ))}
            {sortedTransactions.length > 3 ? (
              <button
                className="transactions-toggle"
                type="button"
                onClick={() => setShowAllTransactions((current) => !current)}
                aria-expanded={showAllTransactions}
              >
                {showAllTransactions
                  ? 'Свернуть'
                  : `Показать ещё ${sortedTransactions.length - 3}`}
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
