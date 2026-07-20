import { useMemo, useState } from 'react';
import { formatTransactionDate, getMonthLabel } from '../utils/date';
import {
  ANALYTICS_PERIODS, filterAnalyticsPeriod, getAnalyticsRange, getAnalyticsSummary, getCategoryAnalytics,
  getComparison, getDailySeries, getExpenseAverages, getMonthForecast, getMonthlySeries,
  getMostExpensiveDay, getPreviousAnalyticsRange, getTopTransactions, getUserExpenses
} from '../utils/analytics';

function changeLabel(metric, formatCurrency) {
  if (metric.percent === null) return 'Нет данных для сравнения';
  const direction = metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '→';
  return `${direction} ${formatCurrency(Math.abs(metric.change))} · ${Math.abs(metric.percent).toFixed(0)}%`;
}

function Empty({ children }) { return <div className="empty-state analytics-empty"><span aria-hidden="true">📊</span><p>{children}</p></div>; }

function AnalyticsPage({ selectedMonth, allTransactions, users = [], formatCurrency, getCategoryIcon, onBack, onOpenCategory, onOpenUser, onOpenTransaction }) {
  const [periodId, setPeriodId] = useState('current');
  const range = useMemo(() => getAnalyticsRange(selectedMonth, periodId), [selectedMonth, periodId]);
  const periodTransactions = useMemo(() => filterAnalyticsPeriod(allTransactions, range), [allTransactions, range]);
  const previousTransactions = useMemo(() => filterAnalyticsPeriod(allTransactions, getPreviousAnalyticsRange(range)), [allTransactions, range]);
  const summary = useMemo(() => getAnalyticsSummary(periodTransactions), [periodTransactions]);
  const previousSummary = useMemo(() => getAnalyticsSummary(previousTransactions), [previousTransactions]);
  const comparison = useMemo(() => getComparison(summary, previousSummary), [summary, previousSummary]);
  const categories = useMemo(() => getCategoryAnalytics(periodTransactions), [periodTransactions]);
  const previousCategories = useMemo(() => new Map(getCategoryAnalytics(previousTransactions).map((item) => [item.category, item.amount])), [previousTransactions]);
  const topOperations = useMemo(() => getTopTransactions(periodTransactions), [periodTransactions]);
  const userExpenses = useMemo(() => getUserExpenses(periodTransactions, users), [periodTransactions, users]);
  const averages = useMemo(() => getExpenseAverages(periodTransactions, range), [periodTransactions, range]);
  const expensiveDay = useMemo(() => getMostExpensiveDay(periodTransactions), [periodTransactions]);
  const forecast = useMemo(() => getMonthForecast(periodTransactions, selectedMonth), [periodTransactions, selectedMonth]);
  const timeSeries = useMemo(() => range.months === 1 ? getDailySeries(periodTransactions, range) : getMonthlySeries(periodTransactions, range), [periodTransactions, range]);
  const sixMonthRange = useMemo(() => getAnalyticsRange(selectedMonth, 'six'), [selectedMonth]);
  const monthComparison = useMemo(() => getMonthlySeries(filterAnalyticsPeriod(allTransactions, sixMonthRange), sixMonthRange), [allTransactions, sixMonthRange]);
  const maxTimeline = Math.max(1, ...timeSeries.map((item) => Math.max(item.income, item.expense)));
  const maxMonth = Math.max(1, ...monthComparison.map((item) => Math.max(item.income, item.expense)));
  const periodLabel = range.start === range.end ? getMonthLabel(range.end) : `${getMonthLabel(range.start)} — ${getMonthLabel(range.end)}`;

  return <div className="screen analytics-screen advanced-analytics-screen">
    <header className="topbar"><div><p className="eyebrow">Статистика</p><h2>Аналитика</h2><p className="muted">{periodLabel}</p></div><button className="ghost-btn" type="button" onClick={onBack}>Назад</button></header>
    <section className="card analytics-periods" aria-label="Период аналитики"><div className="period-scroll">{ANALYTICS_PERIODS.map((period) => <button key={period.id} type="button" className={periodId === period.id ? 'active' : ''} onClick={() => setPeriodId(period.id)}>{period.label}</button>)}</div></section>
    {!periodTransactions.length ? <Empty>Добавьте несколько операций, чтобы увидеть аналитику за выбранный период.</Empty> : <>
      <section className="card"><div className="section-title"><h4>Главное за период</h4><span>{summary.count} оп.</span></div><div className="analytics-kpi-grid">
        <div><span>Доход</span><strong className="positive">{formatCurrency(summary.income)}</strong><small>{changeLabel(comparison.income, formatCurrency)}</small></div>
        <div><span>Расход</span><strong className="negative">{formatCurrency(summary.expense)}</strong><small>{changeLabel(comparison.expense, formatCurrency)}</small></div>
        <div><span>Разница</span><strong className={summary.balance < 0 ? 'negative' : 'positive'}>{formatCurrency(summary.balance)}</strong><small>{changeLabel(comparison.balance, formatCurrency)}</small></div>
        <div><span>Расход в день</span><strong>{formatCurrency(averages.perCalendarDay)}</strong><small>за календарный день</small></div>
      </div></section>
      {expensiveDay ? <section className="card analytics-insight"><div><p className="eyebrow">Самый дорогой день</p><strong>{formatTransactionDate(expensiveDay.date)}</strong><p>{formatCurrency(expensiveDay.amount)} · {expensiveDay.count} оп. · {getCategoryIcon(expensiveDay.category)} {expensiveDay.category}</p></div></section> : null}
      <section className="card"><div className="section-title"><h4>Доходы и расходы</h4><span>{range.months === 1 ? 'По дням' : 'По месяцам'}</span></div><div className="analytics-bars timeline-bars">{timeSeries.map((item) => <div className="analytics-bar" key={item.key} title={`${item.label || getMonthLabel(item.key)}: доход ${formatCurrency(item.income)}, расход ${formatCurrency(item.expense)}`}><div className="analytics-bar__pair"><i className="income-bar" style={{ height: `${item.income / maxTimeline * 100}%` }} /><i className="expense-bar" style={{ height: `${item.expense / maxTimeline * 100}%` }} /></div><small>{range.months === 1 ? item.label : getMonthLabel(item.key).slice(0, 3)}</small></div>)}</div><p className="chart-caption"><span className="income-dot" /> Доход <span className="expense-dot" /> Расход</p></section>
      <section className="card"><div className="section-title"><h4>Расходы по категориям</h4><span>{formatCurrency(summary.expense)}</span></div>{categories.length ? <div className="analytics-category-list">{categories.slice(0, 6).map((item) => <button key={item.category} type="button" className="analytics-category-row" onClick={() => onOpenCategory(item.category)}><span>{getCategoryIcon(item.category)}</span><div><strong>{item.category}</strong><small>{formatCurrency(item.amount)} · {item.percent.toFixed(0)}%</small><div className="progress-bar"><div className="progress-fill" style={{ width: `${item.percent}%` }} /></div></div></button>)}</div> : <Empty>За выбранный период расходов не было.</Empty>}</section>
      <section className="card"><div className="section-title"><h4>Самые большие расходы</h4><span>Топ-5</span></div>{categories.length ? <div className="top-category-list">{categories.slice(0, 5).map((item) => { const previous = previousCategories.get(item.category) || 0; const change = item.amount - previous; return <button key={item.category} type="button" className="top-category-row" onClick={() => onOpenCategory(item.category)}><span>{getCategoryIcon(item.category)}</span><strong>{item.category}</strong><b>{formatCurrency(item.amount)}</b><small>{previous ? `${change >= 0 ? '↑' : '↓'} ${formatCurrency(Math.abs(change))}` : 'Нет сравнения'}</small></button>; })}</div> : null}</section>
      <section className="card"><div className="section-title"><h4>Крупные операции</h4><span>Топ-5</span></div><div className="transaction-list">{topOperations.map((item) => <button key={item.id} type="button" className="transaction-item transaction-item--interactive" onClick={() => onOpenTransaction?.(item)}><div className="transaction-icon">{getCategoryIcon(item.category)}</div><div className="transaction-info"><strong>{item.category}</strong><p>• {item.person}</p>{item.comment ? <p className="transaction-comment">{item.comment}</p> : null}</div><div className="transaction-meta"><span className="amount negative">-{formatCurrency(item.amount)}</span><p>{formatTransactionDate(item.date, item.time)}</p></div></button>)}</div></section>
      {userExpenses.length > 1 ? <section className="card"><div className="section-title"><h4>Расходы по участникам</h4><span>{userExpenses.length}</span></div>{userExpenses.map(({ user, amount, count, percent }) => <button key={user.id} type="button" className="analytics-user-row" onClick={() => onOpenUser?.(user)}><span>{user.avatar}</span><strong>{user.name}</strong><small>{count} оп. · {percent.toFixed(0)}%</small><b>{formatCurrency(amount)}</b></button>)}</section> : null}
      <section className="card"><div className="section-title"><h4>Средние расходы</h4></div><div className="analytics-average-grid"><div><span>Календарный день</span><strong>{formatCurrency(averages.perCalendarDay)}</strong></div><div><span>День с тратами</span><strong>{formatCurrency(averages.perSpendingDay)}</strong></div><div><span>Одна операция</span><strong>{formatCurrency(averages.perOperation)}</strong></div></div></section>
      {forecast ? <section className="card analytics-insight"><p className="eyebrow">Прогноз до конца месяца</p><strong>{formatCurrency(forecast.projected)}</strong><p>Потрачено {formatCurrency(forecast.spent)}. Линейная оценка по {forecast.elapsed} прошедшим дням — не точный прогноз.</p></section> : null}
      <section className="card"><div className="section-title"><h4>Сравнение месяцев</h4><span>6 месяцев</span></div><div className="analytics-bars month-bars">{monthComparison.map((item) => <div className="analytics-bar" key={item.key}><div className="analytics-bar__pair"><i className="income-bar" style={{ height: `${item.income / maxMonth * 100}%` }} /><i className="expense-bar" style={{ height: `${item.expense / maxMonth * 100}%` }} /></div><small>{getMonthLabel(item.key).slice(0, 3)}</small></div>)}</div></section>
    </>}
  </div>;
}

export default AnalyticsPage;
