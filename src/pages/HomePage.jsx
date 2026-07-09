function HomePage({
  currentBalance,
  selectedMonth,
  availableMonths,
  totalIncome,
  totalExpense,
  expenseBreakdown,
  filteredTransactions,
  formatCurrency,
  formatTransactionDate,
  getMonthLabel,
  onMonthChange,
  onOpenTransactionDetails
}) {
  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Семейный бюджет</p>
          <h2>Обзор</h2>
        </div>
      </header>

      <section className="card balance-card">
        <div className="balance-row">
          <div>
            <p className="eyebrow">Текущий баланс</p>
            <h3>{formatCurrency(currentBalance)}</h3>
            <p className="balance-caption">Доступно для ваших планов</p>
          </div>
        </div>
        <div className="pill-row">
          <label className="pill-select">
            <span>Месяц</span>
            <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
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
        <div className="section-title">
          <h4>Категории расходов</h4>
          <span>{formatCurrency(totalExpense)}</span>
        </div>
        {expenseBreakdown.length === 0 ? (
          <p className="muted">Пока нет расходов за выбранный месяц.</p>
        ) : (
          expenseBreakdown.map((item) => (
            <div key={item.category} className="progress-row">
              <div className="progress-label">
                <span>{item.category}</span>
                <strong>{formatCurrency(item.sum)}</strong>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(8, (item.sum / Math.max(totalExpense, 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <div className="section-title">
          <h4>Последние операции</h4>
          <span>{filteredTransactions.length}</span>
        </div>
        {filteredTransactions.length === 0 ? (
          <p className="muted">Пока нет операций за этот месяц.</p>
        ) : (
          <div className="transaction-list">
            {[...filteredTransactions]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 6)
              .map((transaction) => (
                <button
                  key={`${transaction.id}-${transaction.date}`}
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
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
