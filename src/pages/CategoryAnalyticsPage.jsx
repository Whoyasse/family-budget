import { useMemo, useState } from 'react';
import { getAllTimeCategoryStats, getMonthKeysEndingAt, getCategoryMonthlySeries, getCategoryTransactions, sumMonthlySeries } from '../utils/categoryAnalytics';
import { getCategoryColor } from '../data/categories';

function getMonthShortLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
}

function CategoryAnalyticsPage({ category, selectedMonth, transactions, formatCurrency, formatTransactionDate, getMonthLabel, getCategoryIcon, onBack, onOpenTransaction }) {
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const analytics = useMemo(() => {
    const months12 = getMonthKeysEndingAt(selectedMonth, 12);
    const monthlySeries = getCategoryMonthlySeries(transactions, category, months12);
    const current = monthlySeries.at(-1)?.total || 0;
    const previous = monthlySeries.at(-2)?.total || 0;
    const series3 = monthlySeries.slice(-3);
    const series6 = monthlySeries.slice(-6);
    const total3 = sumMonthlySeries(series3);
    const total6 = sumMonthlySeries(series6);
    const total12 = sumMonthlySeries(monthlySeries);
    const transactionsForMonth = getCategoryTransactions(transactions, category, selectedMonth);
    const allTime = getAllTimeCategoryStats(transactions, category);
    const monthsWithSpending = monthlySeries.filter((item) => item.total > 0);

    return {
      current,
      previous,
      total3,
      total6,
      total12,
      monthlySeries,
      transactionsForMonth,
      allTime,
      mostExpensive: monthsWithSpending.slice().sort((a, b) => b.total - a.total)[0] || null,
      leastExpensive: monthsWithSpending.slice().sort((a, b) => a.total - b.total)[0] || null
    };
  }, [category, selectedMonth, transactions]);

  const maxValue = Math.max(...analytics.monthlySeries.map((item) => item.total), 1);
  const difference = analytics.current - analytics.previous;
  const comparison = analytics.previous > 0
    ? `${difference >= 0 ? '↑' : '↓'} ${Math.round((Math.abs(difference) / analytics.previous) * 100)}% к прошлому месяцу`
    : 'В прошлом месяце расходов не было';

  const summaryCards = [
    ['Этот месяц', analytics.current],
    ['Прошлый месяц', analytics.previous],
    ['Последние 3 месяца', analytics.total3],
    ['Последние 6 месяцев', analytics.total6],
    ['Последний год', analytics.total12]
  ];
  const displayedTransactions = showAllTransactions ? analytics.allTime.history : analytics.transactionsForMonth;

  return (
    <div className="screen category-analytics-screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">Категория · {getMonthLabel(selectedMonth)}</p>
          <h2>{getCategoryIcon(category)} {category}</h2>
        </div>
        <button className="ghost-btn" type="button" onClick={onBack}>Назад</button>
      </header>

      <section className="card category-analytics-comparison">
        <p className="eyebrow">Сравнение с прошлым месяцем</p>
        <strong className={analytics.previous > 0 && difference !== 0 ? (difference > 0 ? 'comparison-up' : 'comparison-down') : ''}>{comparison}</strong>
      </section>

      <section className="category-analytics-summary-grid">
        {summaryCards.map(([label, amount]) => <div className="card summary-card" key={label}><p>{label}</p><strong>{formatCurrency(amount)}</strong></div>)}
      </section>

      <section className="card all-time-category-card">
        <div className="section-title"><h4>За всё время</h4><span>{analytics.allTime.count}</span></div>
        <div className="all-time-category-grid"><div><span>Всего расходов</span><strong>{formatCurrency(analytics.allTime.total)}</strong></div><div><span>Операций</span><strong>{analytics.allTime.count}</strong></div><div><span>Средняя операция</span><strong>{formatCurrency(analytics.allTime.averageAmount)}</strong></div></div>
      </section>

      <section className="category-analytics-summary-grid category-operation-stats">
        <div className="card summary-card"><p>Операций</p><strong>{analytics.allTime.count}</strong></div>
        <div className="card summary-card"><p>Последняя операция</p><strong>{analytics.allTime.lastTransaction ? formatTransactionDate(analytics.allTime.lastTransaction.date, analytics.allTime.lastTransaction.time) : '—'}</strong></div>
        <div className="card summary-card"><p>Самый большой расход</p><strong>{formatCurrency(analytics.allTime.largestTransaction?.amount || 0)}</strong></div>
        <div className="card summary-card"><p>Средняя операция</p><strong>{formatCurrency(analytics.allTime.averageAmount)}</strong></div>
      </section>

      <section className="card category-averages-card">
        <div className="section-title"><h4>Среднее в месяц</h4><span>{getMonthLabel(selectedMonth)}</span></div>
        <div className="category-averages-grid">
          <div><span>3 месяца</span><strong>{formatCurrency(analytics.total3 / 3)}</strong></div>
          <div><span>6 месяцев</span><strong>{formatCurrency(analytics.total6 / 6)}</strong></div>
          <div><span>12 месяцев</span><strong>{formatCurrency(analytics.total12 / 12)}</strong></div>
        </div>
      </section>

      <section className="card category-trend-card">
        <div className="section-title"><h4>Расходы за 12 месяцев</h4><span>{formatCurrency(analytics.total12)}</span></div>
        <svg className="category-trend-chart" viewBox="0 0 360 166" role="img" aria-label={`Расходы категории ${category} за 12 месяцев`}>
          {analytics.monthlySeries.map((item, index) => {
            const barWidth = 18;
            const gap = 12;
            const x = 10 + index * (barWidth + gap);
            const height = Math.max(item.total > 0 ? 5 : 0, (item.total / maxValue) * 112);
            const y = 132 - height;
            const isSelected = item.month === selectedMonth;
            return <g key={item.month}>
              <title>{`${getMonthShortLabel(item.month)}: ${formatCurrency(item.total)}`}</title>
              <rect className="category-trend-chart__bar-bg" x={x} y="20" width={barWidth} height="112" rx="5" />
              <rect x={x} y={y} width={barWidth} height={height} rx="5" fill={isSelected ? getCategoryColor(category) : 'var(--accent-soft)'} />
              <text x={x + barWidth / 2} y="153" textAnchor="middle" className={isSelected ? 'selected' : ''}>{getMonthShortLabel(item.month)}</text>
            </g>;
          })}
        </svg>
      </section>

      <section className="card category-insights-card">
        <div className="section-title"><h4>Наблюдения</h4></div>
        {analytics.mostExpensive ? <div className="category-insights-list"><p><span>Самый большой расход</span><strong>{getMonthLabel(analytics.mostExpensive.month)} · {formatCurrency(analytics.mostExpensive.total)}</strong></p><p><span>Минимальный месяц с расходами</span><strong>{getMonthLabel(analytics.leastExpensive.month)} · {formatCurrency(analytics.leastExpensive.total)}</strong></p></div> : <p className="muted">За последние 12 месяцев расходов по этой категории пока нет.</p>}
      </section>

      <section className="card">
        <div className="section-title"><h4>{showAllTransactions ? 'Все операции' : 'Операции за месяц'}</h4><span>{displayedTransactions.length}</span></div>
        {analytics.allTime.count > 0 ? <button type="button" className="text-action transaction-history-toggle" onClick={() => setShowAllTransactions((current) => !current)}>{showAllTransactions ? 'Только выбранный месяц' : `Все операции (${analytics.allTime.count})`}</button> : null}
        {displayedTransactions.length === 0 ? <p className="muted">{showAllTransactions ? 'Операций по этой категории нет.' : 'В этом месяце операций нет.'}</p> : <div className="transaction-list">
          {displayedTransactions.map((transaction) => <button key={`${transaction.id}-${transaction.date}-${transaction.time}`} type="button" className="transaction-item transaction-item--interactive" onClick={() => onOpenTransaction(transaction)}>
            <div className="transaction-icon">↘</div><div className="transaction-info"><strong>{transaction.category}</strong><p>{transaction.person ? `• ${transaction.person}` : ''}</p>{transaction.comment ? <p className="transaction-comment">{transaction.comment}</p> : null}</div><div className="transaction-meta"><span className="amount negative">-{formatCurrency(transaction.amount)}</span><p>{formatTransactionDate(transaction.date, transaction.time)}</p></div>
          </button>)}
        </div>}
      </section>
    </div>
  );
}

export default CategoryAnalyticsPage;
