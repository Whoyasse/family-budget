function AnalyticsPage({ monthlyTotals, expenseBreakdown, totalExpense, selectedMonth, formatCurrency, getMonthLabel, onBack }) {
  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Статистика</p>
          <h2>Аналитика</h2>
        </div>
        <button className="ghost-btn" onClick={onBack}>
          Назад
        </button>
      </header>

      <section className="card">
        <div className="section-title">
          <h4>Ежемесячные итоги</h4>
          <span>EUR</span>
        </div>
        <div className="stats-list">
          {monthlyTotals.map(([month, values]) => (
            <div key={month} className="stat-item">
              <div>
                <strong>{getMonthLabel(month)}</strong>
                <p>Доход: {formatCurrency(values.income)}</p>
              </div>
              <span>Расход: {formatCurrency(values.expense)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h4>Разбивка по категориям</h4>
          <span>{getMonthLabel(selectedMonth)}</span>
        </div>
        {expenseBreakdown.length === 0 ? (
          <p className="muted">Пока нет данных.</p>
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
    </div>
  );
}

export default AnalyticsPage;
