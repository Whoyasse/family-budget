export const calendarHeatColors = {
  base: 'rgba(255, 255, 255, 0.04)',
  low: 'color-mix(in srgb, var(--accent-primary) 12%, var(--theme-surface))',
  medium: 'color-mix(in srgb, var(--accent-primary) 24%, var(--theme-surface))',
  high: 'color-mix(in srgb, var(--accent-primary) 40%, var(--theme-surface))',
  intense: 'color-mix(in srgb, var(--accent-primary) 58%, var(--theme-surface))'
};

export function getCalendarHeatColor(transactionCount) {
  if (transactionCount <= 0) return calendarHeatColors.base;
  if (transactionCount === 1) return calendarHeatColors.low;
  if (transactionCount <= 3) return calendarHeatColors.medium;
  if (transactionCount <= 5) return calendarHeatColors.high;
  return calendarHeatColors.intense;
}
