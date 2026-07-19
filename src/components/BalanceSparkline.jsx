function BalanceSparkline({ points }) {
  const values = points.map((point) => point.balance); const min = Math.min(...values, 0); const max = Math.max(...values, 1); const span = max - min || 1;
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${(index / Math.max(points.length - 1, 1)) * 100} ${42 - ((point.balance - min) / span) * 38}`).join(' ');
  return <svg className="balance-sparkline" viewBox="0 0 100 44" preserveAspectRatio="none" aria-label="Изменение баланса"><path d={path} fill="none" stroke="var(--accent-bright)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}
export default BalanceSparkline;
