import { useMemo, useState } from 'react';
import { getBalancePeriod, getBalanceStats } from '../utils/balanceHistory';
import BalanceSparkline from '../components/BalanceSparkline';

function BalancePage({ points, formatCurrency, onBack }) {
  const [period, setPeriod] = useState('month');
  const visible = useMemo(() => getBalancePeriod(points, period), [points, period]);
  const stats = getBalanceStats(visible);
  return <div className="screen"><header className="topbar"><div><p className="eyebrow">Баланс</p><h2>{formatCurrency(stats.current)}</h2></div><button className="ghost-btn" type="button" onClick={onBack}>Назад</button></header><section className="card balance-detail-chart"><div className="balance-period-control">{[['week','Неделя'],['month','Месяц'],['year','Год'],['all','Всё время']].map(([id,label]) => <button type="button" key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{label}</button>)}</div><BalanceSparkline points={visible} /></section><section className="category-analytics-summary-grid"><div className="card summary-card"><p>Максимум</p><strong>{formatCurrency(stats.highest)}</strong></div><div className="card summary-card"><p>Минимум</p><strong>{formatCurrency(stats.lowest)}</strong></div><div className="card summary-card"><p>Средний</p><strong>{formatCurrency(stats.average)}</strong></div><div className="card summary-card"><p>Изменение</p><strong className={stats.change >= 0 ? 'positive' : 'negative'}>{formatCurrency(stats.change)}</strong></div></section></div>;
}
export default BalancePage;
