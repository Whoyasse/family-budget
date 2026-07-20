import { useMemo, useState } from 'react';
import { formatTransactionDate, getMonthLabel } from '../utils/date';
import { getCategoryColor } from '../data/categories';
import {
  ANALYTICS_PERIODS, filterAnalyticsPeriod, getAnalyticsRange, getAnalyticsSummary, getCategoryAnalytics,
  getComparison, getExpenseAverages, getMonthForecast,
  getMostExpensiveDay, getPreviousAnalyticsRange, getTopTransactions, getUserExpenses
} from '../utils/analytics';

export const ANALYTICS_TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'categories', label: 'Категории' },
  { id: 'trend', label: 'Пользователи' }
];

function Empty({ children }) { return <div className="empty-state analytics-empty"><span aria-hidden="true">📊</span><p>{children}</p></div>; }
function Comparison({ comparison, formatCurrency }) {
  if (comparison.income.percent === null && comparison.expense.percent === null && comparison.balance.percent === null) return <p className="analytics-comparison-empty">Недостаточно данных для сравнения с предыдущим периодом.</p>;
  const row = (label, metric) => metric.percent === null ? null : <span><b>{label}</b> {metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '→'} {formatCurrency(Math.abs(metric.change))} · {Math.abs(metric.percent).toFixed(0)}%</span>;
  return <div className="analytics-comparison">{row('Доход', comparison.income)}{row('Расход', comparison.expense)}{row('Разница', comparison.balance)}</div>;
}

function UserExpenseRow({ entry, formatCurrency, onOpenUser }) {
  const canOpenDetails = typeof onOpenUser === 'function';
  const content = <><span className="analytics-user-avatar">{entry.user.avatar}</span><div className="analytics-user-info"><strong>{entry.user.name}</strong><small>{entry.count} оп. · {entry.percent.toFixed(0)}%</small></div><div className="analytics-user-amount"><b className="responsive-money">{formatCurrency(entry.amount)}</b>{canOpenDetails ? <span className="analytics-user-action" aria-hidden="true">›</span> : null}</div><div className="progress-bar"><div className="progress-fill" style={{ width: `${entry.percent}%` }} /></div></>;
  return canOpenDetails
    ? <button type="button" className="analytics-user-row" onClick={() => onOpenUser(entry.user)}>{content}</button>
    : <div className="analytics-user-row">{content}</div>;
}

function AnalyticsPage({ selectedMonth, allTransactions, users = [], formatCurrency, getCategoryIcon, onBack, onOpenCategory, onOpenUser, onOpenTransaction, activeTab = 'overview', onTabChange }) {
  const [periodId, setPeriodId] = useState('current');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const range = useMemo(() => getAnalyticsRange(selectedMonth, periodId), [selectedMonth, periodId]);
  const items = useMemo(() => filterAnalyticsPeriod(allTransactions, range), [allTransactions, range]);
  const previous = useMemo(() => filterAnalyticsPeriod(allTransactions, getPreviousAnalyticsRange(range)), [allTransactions, range]);
  const summary = useMemo(() => getAnalyticsSummary(items), [items]);
  const comparison = useMemo(() => getComparison(summary, getAnalyticsSummary(previous)), [summary, previous]);
  const categories = useMemo(() => getCategoryAnalytics(items), [items]);
  const donutSegments = useMemo(() => {
    let offset = 0;
    return categories.map((item) => {
      const segment = { ...item, offset, color: getCategoryColor(item.category) };
      offset += item.percent;
      return segment;
    });
  }, [categories]);
  const topOperations = useMemo(() => getTopTransactions(items), [items]);
  const userExpenses = useMemo(() => getUserExpenses(items, users), [items, users]);
  const averages = useMemo(() => getExpenseAverages(items, range), [items, range]);
  const expensiveDay = useMemo(() => getMostExpensiveDay(items), [items]);
  const forecast = useMemo(() => getMonthForecast(items, selectedMonth), [items, selectedMonth]);
  const periodLabel = range.start === range.end ? getMonthLabel(range.end) : `${getMonthLabel(range.start)} — ${getMonthLabel(range.end)}`;

  const overview = <>
    <section className="card analytics-summary-card"><div className="section-title"><h4>Итоги периода</h4><span>{summary.count} оп.</span></div><div className="analytics-main-kpis"><div><span>Доход</span><strong className="positive responsive-money">{formatCurrency(summary.income)}</strong></div><div><span>Расход</span><strong className="negative responsive-money">{formatCurrency(summary.expense)}</strong></div><div className="analytics-kpi-balance"><span>Разница</span><strong className={summary.balance < 0 ? 'negative responsive-money' : 'positive responsive-money'}>{formatCurrency(summary.balance)}</strong></div></div><Comparison comparison={comparison} formatCurrency={formatCurrency} /></section>
    <section className="card analytics-detail-card"><div className="section-title"><h4>Средние расходы</h4></div><div className="analytics-average-rows"><p><span>За календарный день</span><b className="responsive-money">{formatCurrency(averages.perCalendarDay)}</b></p><p><span>В день с тратами</span><b className="responsive-money">{formatCurrency(averages.perSpendingDay)}</b></p><p><span>Одна операция</span><b className="responsive-money">{formatCurrency(averages.perOperation)}</b></p></div></section>
    {expensiveDay ? <section className="card analytics-detail-card"><p className="eyebrow">Самый дорогой день</p><div className="analytics-inline-insight"><div><strong>{formatTransactionDate(expensiveDay.date)}</strong><p>{expensiveDay.count} оп. · {getCategoryIcon(expensiveDay.category)} {expensiveDay.category}</p></div><b className="responsive-money negative">{formatCurrency(expensiveDay.amount)}</b></div></section> : null}
    {forecast ? <section className="card analytics-forecast"><p className="eyebrow">Прогноз до конца месяца</p><div><strong className="responsive-money">{formatCurrency(forecast.projected)}</strong><span>Линейный прогноз по текущему темпу расходов</span></div></section> : null}
  </>;

  const categoryTab = <>
    <section className="card"><div className="section-title"><div><h4>Расходы по категориям</h4><small className="analytics-section-hint">Нажмите на категорию, чтобы открыть детали</small></div><span className="responsive-money">{formatCurrency(summary.expense)}</span></div>{categories.length ? <div className="analytics-donut-layout"><div className="chart-shell analytics-donut"><svg viewBox="0 0 120 120" className="donut-chart" aria-label="Распределение расходов по категориям"><circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />{donutSegments.map((segment) => { const radius = 42; const circle = 2 * Math.PI * radius; const length = segment.percent / 100 * circle; return <circle key={segment.category} cx="60" cy="60" r={radius} fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={`${Math.max(0, length - 2)} ${circle - Math.max(0, length - 2)}`} strokeDashoffset={-(segment.offset / 100) * circle} transform="rotate(-90 60 60)" />; })}</svg><div className="chart-center"><strong className="responsive-money">{formatCurrency(summary.expense)}</strong><span>расходов</span></div></div><div className="analytics-category-list">{categories.slice(0, 5).map((item) => <button key={item.category} type="button" className="analytics-category-row" onClick={() => onOpenCategory(item.category)}><i className="analytics-category-color" style={{ backgroundColor: getCategoryColor(item.category) }} /><span>{getCategoryIcon(item.category)}</span><div><strong>{item.category}</strong><small className="responsive-money">{formatCurrency(item.amount)} · {item.percent.toFixed(0)}%</small><div className="progress-bar"><div className="progress-fill" style={{ width: `${item.percent}%`, backgroundColor: getCategoryColor(item.category) }} /></div></div><span className="analytics-category-action" aria-hidden="true">›</span></button>)}</div></div> : <Empty>За выбранный период расходов не было.</Empty>}</section>
    <section className="card"><div className="section-title"><h4>Крупные операции</h4><span>Топ-5</span></div>{topOperations.length ? <div className="transaction-list">{topOperations.map((item) => <button key={item.id} type="button" className="transaction-item transaction-item--interactive" onClick={() => onOpenTransaction?.(item)}><div className="transaction-icon">{getCategoryIcon(item.category)}</div><div className="transaction-info"><strong>{item.category}</strong><p>• {item.person}</p>{item.comment ? <p className="transaction-comment">{item.comment}</p> : null}</div><div className="transaction-meta"><span className="amount negative responsive-money">-{formatCurrency(item.amount)}</span><p>{formatTransactionDate(item.date, item.time)}</p></div></button>)}</div> : <Empty>Крупных расходов за период нет.</Empty>}</section>
  </>;

  const trendTab = <>
    <section className="card analytics-users-card"><div className="section-title"><h4>Расходы по участникам</h4></div>{userExpenses.length ? <div className="analytics-user-list">{userExpenses.map((entry) => <UserExpenseRow key={entry.user.id} entry={entry} formatCurrency={formatCurrency} onOpenUser={onOpenUser} />)}</div> : <p className="analytics-user-empty">За выбранный период расходов по участникам нет.</p>}</section>
  </>;

  const selectedPeriodLabel = ANALYTICS_PERIODS.find((item) => item.id === periodId)?.label || 'Этот месяц';
  return <div className="screen analytics-screen advanced-analytics-screen"><header className="topbar"><div><p className="eyebrow">Статистика</p><h2>Аналитика</h2><p className="muted">{periodLabel}</p></div><button className="ghost-btn" type="button" onClick={onBack}>Назад</button></header><section className="card analytics-tabs analytics-section-tabs">{ANALYTICS_TABS.map((item) => <button key={item.id} type="button" className={`analytics-tab ${activeTab === item.id ? 'active' : ''}`} onClick={() => onTabChange?.(item.id)}>{item.label}</button>)}</section><div className="analytics-period-picker"><button type="button" className={`analytics-period-trigger ${isPeriodOpen ? 'open' : ''}`} aria-expanded={isPeriodOpen} onClick={() => setIsPeriodOpen((current) => !current)}><span aria-hidden="true">🗓️</span><div><small>Период</small><strong>{selectedPeriodLabel}</strong></div><span className="analytics-period-caret" aria-hidden="true">⌄</span></button>{isPeriodOpen ? <div className="analytics-period-menu"><p>Выберите период</p>{ANALYTICS_PERIODS.map((period) => <button key={period.id} type="button" className={periodId === period.id ? 'active' : ''} onClick={() => { setPeriodId(period.id); setIsPeriodOpen(false); }}><span>{period.label}</span>{periodId === period.id ? <b aria-label="Выбрано">✓</b> : null}</button>)}</div> : null}</div>{!items.length ? <Empty>Добавьте несколько операций, чтобы увидеть аналитику за выбранный период.</Empty> : <div className="analytics-tab-content">{activeTab === 'overview' ? overview : activeTab === 'categories' ? categoryTab : trendTab}</div>}</div>;
}

export default AnalyticsPage;
