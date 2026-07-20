import { useMemo, useState } from 'react';
import { getUserTransactionNames } from '../utils/settingsStorage';
import { calculateTotals } from '../utils/statistics';
import { parseDate, parseTimeValue } from '../utils/date';
import { ANALYTICS_PERIODS, filterAnalyticsPeriod, getAnalyticsRange } from '../utils/analytics';

function timestamp(transaction) {
  const date = parseDate(transaction.date); const time = parseTimeValue(transaction.time);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), time?.getHours() || 0, time?.getMinutes() || 0).getTime() : 0;
}

function UserAnalyticsPage({ user, selectedMonth, allTransactions, formatCurrency, formatTransactionDate, getMonthLabel, onBack, onOpenTransaction }) {
  const names = useMemo(() => getUserTransactionNames(user), [user]);
  const [periodId, setPeriodId] = useState('current');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const range = useMemo(() => getAnalyticsRange(selectedMonth, periodId), [selectedMonth, periodId]);
  const periodTransactions = useMemo(() => filterAnalyticsPeriod(allTransactions, range).filter((transaction) => names.has(transaction.person)), [allTransactions, range, names]);
  const totals = calculateTotals(periodTransactions);
  const recent = [...periodTransactions].sort((a, b) => timestamp(b) - timestamp(a));
  const visibleTransactions = showAllTransactions ? recent : recent.slice(0, 3);
  const selectedPeriodLabel = ANALYTICS_PERIODS.find((period) => period.id === periodId)?.label || 'Этот месяц';
  const periodLabel = range.start === range.end ? getMonthLabel(range.end) : `${getMonthLabel(range.start)} — ${getMonthLabel(range.end)}`;
  return <div className="screen category-analytics-screen"><header className="topbar"><div><p className="eyebrow">Пользователь</p><h2>{user.avatar} {user.name}</h2><p className="muted">{periodLabel}</p></div><button className="ghost-btn" type="button" onClick={onBack}>Назад</button></header><div className="analytics-period-picker user-analytics-period-picker"><button type="button" className={`analytics-period-trigger ${isPeriodOpen ? 'open' : ''}`} aria-expanded={isPeriodOpen} onClick={() => setIsPeriodOpen((current) => !current)}><span aria-hidden="true">🗓️</span><div><small>Период</small><strong>{selectedPeriodLabel}</strong></div><span className="analytics-period-caret" aria-hidden="true">⌄</span></button>{isPeriodOpen ? <div className="analytics-period-menu"><p>Выберите период</p>{ANALYTICS_PERIODS.map((period) => <button key={period.id} type="button" className={periodId === period.id ? 'active' : ''} onClick={() => { setPeriodId(period.id); setIsPeriodOpen(false); setShowAllTransactions(false); }}><span>{period.label}</span>{periodId === period.id ? <b aria-label="Выбрано">✓</b> : null}</button>)}</div> : null}</div><section className="card all-time-summary-card user-month-summary"><p className="eyebrow">Итоги за выбранный период</p><div className="all-time-summary-grid"><div><span>Доход</span><strong className="positive">{formatCurrency(totals.income)}</strong></div><div><span>Расход</span><strong className="negative">{formatCurrency(totals.expense)}</strong></div><div><span>Баланс</span><strong>{formatCurrency(totals.income - totals.expense)}</strong></div></div><p className="muted">{periodTransactions.filter((item) => item.type === 'Доход').length} доходов · {periodTransactions.filter((item) => item.type === 'Расход').length} расходов</p></section><section className="card"><div className="section-title"><h4>Последние операции</h4><span>{recent.length}</span></div>{recent.length ? <><p className="latest-operations-count">Показано {visibleTransactions.length} из {recent.length}</p><div className="transaction-list">{visibleTransactions.map((transaction) => <button key={`${transaction.id}-${transaction.date}-${transaction.time}`} type="button" className="transaction-item transaction-item--interactive" onClick={() => onOpenTransaction(transaction)}><div className="transaction-icon">{transaction.type === 'Доход' ? '↗' : '↘'}</div><div className="transaction-info"><strong>{transaction.category}</strong>{transaction.comment ? <p className="transaction-comment">{transaction.comment}</p> : null}</div><div className="transaction-meta"><span className={transaction.type === 'Доход' ? 'amount positive' : 'amount negative'}>{transaction.type === 'Доход' ? '+' : '-'}{formatCurrency(transaction.amount)}</span><p>{formatTransactionDate(transaction.date, transaction.time)}</p></div></button>)}{recent.length > 3 ? <button className="transactions-toggle" type="button" onClick={() => setShowAllTransactions((current) => !current)} aria-expanded={showAllTransactions}>{showAllTransactions ? 'Свернуть' : `Показать ещё ${recent.length - 3}`}</button> : null}</div></> : <p className="muted">Нет операций за выбранный период.</p>}</section></div>;
}

export default UserAnalyticsPage;
