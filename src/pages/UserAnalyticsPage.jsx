import { useMemo, useState } from 'react';
import { getUserTransactionNames } from '../utils/settingsStorage';
import { calculateTotals } from '../utils/statistics';
import { parseDate, parseTimeValue } from '../utils/date';

function timestamp(transaction) {
  const date = parseDate(transaction.date); const time = parseTimeValue(transaction.time);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), time?.getHours() || 0, time?.getMinutes() || 0).getTime() : 0;
}

function UserAnalyticsPage({ user, selectedMonth, monthlyTransactions, allTransactions, formatCurrency, formatTransactionDate, getMonthLabel, onBack, onOpenTransaction }) {
  const names = useMemo(() => getUserTransactionNames(user), [user]);
  const monthly = useMemo(() => monthlyTransactions.filter((transaction) => names.has(transaction.person)), [monthlyTransactions, names]);
  const allTime = useMemo(() => allTransactions.filter((transaction) => names.has(transaction.person)), [allTransactions, names]);
  const totals = calculateTotals(monthly); const allTimeTotals = calculateTotals(allTime);
  const recent = [...monthly].sort((a, b) => timestamp(b) - timestamp(a));
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const visibleTransactions = showAllTransactions ? recent : recent.slice(0, 3);
  return <div className="screen category-analytics-screen"><header className="topbar"><div><p className="eyebrow">Пользователь</p><h2>{user.avatar} {user.name}</h2><p className="muted">{getMonthLabel(selectedMonth)}</p></div><button className="ghost-btn" type="button" onClick={onBack}>Назад</button></header><section className="card all-time-summary-card"><div className="all-time-summary-grid"><div><span>Доход</span><strong className="positive">{formatCurrency(totals.income)}</strong></div><div><span>Расход</span><strong className="negative">{formatCurrency(totals.expense)}</strong></div><div><span>Баланс</span><strong>{formatCurrency(totals.income - totals.expense)}</strong></div></div><p className="muted">{monthly.filter((item) => item.type === 'Доход').length} доходов · {monthly.filter((item) => item.type === 'Расход').length} расходов</p></section><section className="card"><div className="section-title"><h4>Последние операции</h4><span>{recent.length}</span></div>{recent.length ? <><p className="latest-operations-count">Показано {visibleTransactions.length} из {recent.length}</p><div className="transaction-list">{visibleTransactions.map((transaction) => <button key={`${transaction.id}-${transaction.date}-${transaction.time}`} type="button" className="transaction-item transaction-item--interactive" onClick={() => onOpenTransaction(transaction)}><div className="transaction-icon">{transaction.type === 'Доход' ? '↗' : '↘'}</div><div className="transaction-info"><strong>{transaction.category}</strong>{transaction.comment ? <p className="transaction-comment">{transaction.comment}</p> : null}</div><div className="transaction-meta"><span className={transaction.type === 'Доход' ? 'amount positive' : 'amount negative'}>{transaction.type === 'Доход' ? '+' : '-'}{formatCurrency(transaction.amount)}</span><p>{formatTransactionDate(transaction.date, transaction.time)}</p></div></button>)}{recent.length > 3 ? <button className="transactions-toggle" type="button" onClick={() => setShowAllTransactions((current) => !current)} aria-expanded={showAllTransactions}>{showAllTransactions ? 'Свернуть' : `Показать ещё ${recent.length - 3}`}</button> : null}</div></> : <p className="muted">Нет операций за выбранный месяц.</p>}</section><section className="card all-time-summary-card"><p className="eyebrow">За всё время</p><div className="all-time-summary-grid"><div><span>Доходы</span><strong>{formatCurrency(allTimeTotals.income)}</strong></div><div><span>Расходы</span><strong>{formatCurrency(allTimeTotals.expense)}</strong></div><div><span>Операции</span><strong>{allTime.length}</strong></div></div></section></div>;
}

export default UserAnalyticsPage;
