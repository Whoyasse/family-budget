export const calendarHeatColors = {
  base: 'rgba(255, 255, 255, 0.04)',
  green: 'rgba(49, 201, 109, 0.20)',
  yellow: 'rgba(255, 199, 76, 0.28)',
  orange: 'rgba(255, 143, 77, 0.32)',
  red: 'rgba(255, 99, 99, 0.38)'
};

export function getCalendarHeatColor(totalExpense) {
  if (totalExpense <= 0) return calendarHeatColors.base;
  if (totalExpense <= 50) return calendarHeatColors.green;
  if (totalExpense <= 100) return calendarHeatColors.yellow;
  if (totalExpense <= 199) return calendarHeatColors.orange;
  return calendarHeatColors.red;
}
