import { useMemo, useState } from 'react';
import { expenseCategories, getCategoryColor } from '../data/categories';
import { calculateTotals } from '../utils/statistics';
import { getAllTimeCategoryStats } from '../utils/categoryAnalytics';
import { formatTransactionDate } from '../utils/date';
import { getUserTransactionNames } from '../utils/settingsStorage';

function AnalyticsPage({ monthlyTotals, expenseBreakdown, totalExpense, selectedMonth, filteredTransactions, allTransactions, users = [], categories = expenseCategories, formatCurrency, getMonthLabel, getCategoryIcon, onBack, onOpenCategory, onOpenUser }) {
  const [activeTab, setActiveTab] = useState('charts');
  const selectedMonthSummary = useMemo(() => monthlyTotals.find(([month]) => month === selectedMonth)?.[1] || { income: 0, expense: 0 }, [monthlyTotals, selectedMonth]);
  const chartData = useMemo(() => expenseBreakdown.map((item) => ({ ...item, percent: (item.sum / Math.max(totalExpense, 1)) * 100, color: getCategoryColor(item.category) })), [expenseBreakdown, totalExpense]);
  const donutSegments = useMemo(() => {
    let cumulative = 0;
    return chartData.map((item) => {
      const start = cumulative;
      cumulative += item.percent;
      return { ...item, start };
    });
  }, [chartData]);
  const allTimeSummary = useMemo(() => calculateTotals(allTransactions), [allTransactions]);
  const userStats = useMemo(() => users.map((user) => {
    const names = getUserTransactionNames(user);
    const operations = filteredTransactions.filter((transaction) => names.has(transaction.person));
    const totals = calculateTotals(operations);
    return { user, income: totals.income, expense: totals.expense, count: operations.length };
  }), [filteredTransactions, users]);
  const allCategories = useMemo(() => categories.filter((category) => category.type === 'expense' || !category.type)
    .map((category) => ({ ...category, ...getAllTimeCategoryStats(allTransactions, category.label) }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'ru')), [allTransactions, categories]);

  const renderCharts = () => (
    <div className="stack analytics-stack">
      <section className="card analytics-card"><div className="section-title"><h4>Итоги месяца</h4><span>{getMonthLabel(selectedMonth)}</span></div><div className="summary-grid analytics-summary-grid"><div className="card summary-card income"><p>Доход</p><strong>{formatCurrency(selectedMonthSummary.income)}</strong></div><div className="card summary-card expense"><p>Расход</p><strong>{formatCurrency(selectedMonthSummary.expense)}</strong></div><div className="card summary-card"><p>Баланс месяца</p><strong>{formatCurrency(selectedMonthSummary.income - selectedMonthSummary.expense)}</strong></div></div></section>
      <section className="card analytics-card">
        <div className="section-title"><h4>Распределение расходов</h4><span>{formatCurrency(totalExpense)}</span></div>
        {chartData.length === 0 ? <div className="empty-state"><p>Пока нет расходов за этот месяц.</p></div> : <div className="chart-layout"><div className="chart-shell"><svg viewBox="0 0 120 120" className="donut-chart" aria-label="Распределение расходов"><circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />{donutSegments.map((segment) => { const radius = 42; const circumference = 2 * Math.PI * radius; const length = (segment.percent / 100) * circumference; const visibleLength = Math.max(0, length - Math.min(2, length * 0.18)); return <circle key={segment.category} cx="60" cy="60" r={radius} fill="none" stroke={segment.color} strokeWidth="18" strokeLinecap="butt" strokeDasharray={`${visibleLength} ${circumference - visibleLength}`} strokeDashoffset={-(segment.start / 100) * circumference} transform="rotate(-90 60 60)" />; })}</svg><div className="chart-center"><strong>{formatCurrency(totalExpense)}</strong><span>расходов</span></div></div><div className="chart-legend">{chartData.map((segment) => <button key={segment.category} type="button" className="legend-row category-link-row" onClick={() => onOpenCategory(segment.category)}><div className="legend-marker" style={{ backgroundColor: segment.color }} /><div className="legend-label"><span>{getCategoryIcon(segment.category)} {segment.category}</span><small><b className="category-percent">{segment.percent.toFixed(0)}%</b> · {formatCurrency(segment.sum)}</small></div></button>)}</div></div>}
      </section>
    </div>
  );

  const renderCategories = () => (
    <section className="card analytics-card"><div className="section-title"><h4>Категории расходов</h4><span>{formatCurrency(totalExpense)}</span></div>{expenseBreakdown.length === 0 ? <div className="empty-state"><p>Пока нет расходов за этот месяц.</p></div> : <div className="category-list">{expenseBreakdown.map((item) => { const percent = totalExpense > 0 ? (item.sum / totalExpense) * 100 : 0; return <button key={item.category} type="button" className="category-row category-link-row" onClick={() => onOpenCategory(item.category)}><div className="category-row__main"><span className="category-icon">{getCategoryIcon(item.category)}</span><div><strong>{item.category}</strong><p>{formatCurrency(item.sum)}</p></div></div><div className="category-row__meta"><span>{percent.toFixed(0)}%</span><div className="progress-bar category-progress"><div className="progress-fill" style={{ width: `${Math.max(6, percent)}%`, backgroundColor: getCategoryColor(item.category) }} /></div></div></button>; })}</div>}</section>
  );

  const renderUsers = () => (
    <div className="stack analytics-stack">
      <section className="card analytics-card all-time-summary-card"><p className="eyebrow">Семья за месяц</p><div className="all-time-summary-grid"><div><span>Доходы</span><strong className="positive">{formatCurrency(selectedMonthSummary.income)}</strong></div><div><span>Расходы</span><strong className="negative">{formatCurrency(selectedMonthSummary.expense)}</strong></div><div><span>Баланс</span><strong>{formatCurrency(selectedMonthSummary.income - selectedMonthSummary.expense)}</strong></div></div></section>
      <section className="card analytics-card"><div className="section-title"><h4>Пользователи</h4><span>{users.length}</span></div><div className="category-list">{userStats.map(({ user, income, expense, count }) => <button type="button" key={user.id} className="category-row category-link-row" onClick={() => onOpenUser?.(user)}><div className="category-row__main"><span className="category-icon">{user.avatar}</span><div><strong>{user.name}{user.archived ? ' · Архив' : ''}</strong><p>Доход {formatCurrency(income)} · Расход {formatCurrency(expense)}</p><p>{count} операций · {(totalExpense ? expense / totalExpense * 100 : 0).toFixed(0)}% семейных расходов</p></div></div><div className="category-row__meta"><span className={income - expense >= 0 ? 'positive' : 'negative'}>{formatCurrency(income - expense)}</span></div></button>)}</div></section>
    </div>
  );

  const renderAllCategories = () => (
    <div className="stack analytics-stack">
      <section className="card analytics-card all-time-summary-card"><p className="eyebrow">За всё время</p><div className="all-time-summary-grid"><div><span>Доходы</span><strong className="positive">{formatCurrency(allTimeSummary.income)}</strong></div><div><span>Расходы</span><strong className="negative">{formatCurrency(allTimeSummary.expense)}</strong></div><div><span>Баланс</span><strong>{formatCurrency(allTimeSummary.income - allTimeSummary.expense)}</strong></div></div></section>
      <section className="card analytics-card"><div className="section-title"><h4>Все категории</h4><span>{expenseCategories.length}</span></div><div className="category-list all-categories-list">{allCategories.map((category) => <button key={category.label} type="button" className="category-row category-link-row" onClick={() => onOpenCategory(category.label)}><div className="category-row__main"><span className="category-icon">{category.icon}</span><div><strong>{category.label}</strong>{category.count ? <p>{formatCurrency(category.total)} · {category.count} {category.count === 1 ? 'операция' : 'операций'}</p> : <p>Нет операций</p>}</div></div><div className="category-row__meta all-categories-meta">{category.lastTransaction ? <span>{formatTransactionDate(category.lastTransaction.date, category.lastTransaction.time)}</span> : <span>—</span>}</div></button>)}</div></section>
    </div>
  );

  return <div className="screen analytics-screen"><header className="topbar"><div><p className="eyebrow">Статистика</p><h2>Аналитика</h2></div><button className="ghost-btn" onClick={onBack}>Назад</button></header><div className="card analytics-tabs"><button type="button" className={`analytics-tab ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')}>Диаграммы</button><button type="button" className={`analytics-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Пользователи</button><button type="button" className={`analytics-tab ${activeTab === 'all-categories' ? 'active' : ''}`} onClick={() => setActiveTab('all-categories')}>Все категории</button></div>{activeTab === 'charts' && renderCharts()}{activeTab === 'users' && renderUsers()}{activeTab === 'all-categories' && renderAllCategories()}</div>;
}

export default AnalyticsPage;
