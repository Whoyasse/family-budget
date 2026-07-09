import { getCalendarHeatColor } from '../data/calendarHeat';

function CalendarPage({
  selectedMonth,
  onPrevMonth,
  onCurrentMonth,
  onNextMonth,
  calendarDays,
  onSelectDay,
  getMonthLabel,
  getCategoryIcon
}) {
  return (
    <div className="screen calendar-screen">
      <header className="topbar calendar-topbar">
        <div>
          <p className="eyebrow">Календарь</p>
          <h2>Календарь</h2>
        </div>
        <div className="calendar-nav">
          <button className="ghost-btn" onClick={onPrevMonth} type="button">
            ←
          </button>
          <button className="ghost-btn" onClick={onCurrentMonth} type="button">
            {getMonthLabel(selectedMonth)}
          </button>
          <button className="ghost-btn" onClick={onNextMonth} type="button">
            →
          </button>
        </div>
      </header>

      <section className="card calendar-card">
        <div className="weekday-row">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((weekday) => (
            <span key={weekday} className="weekday-label">{weekday}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((day) => (
            <button
              key={day.dayKey}
              type="button"
              className={`calendar-day ${day.isCurrentMonth ? '' : 'is-muted'} ${day.isToday ? 'is-today' : ''} ${day.totalExpense > 0 ? 'has-expenses' : ''}`}
              onClick={() => onSelectDay(day)}
              style={{ backgroundColor: day.totalExpense > 0 ? getCalendarHeatColor(day.totalExpense) : undefined }}
            >
              <div className="calendar-day__header">
                <span className="calendar-day__number">{day.day}</span>
                {day.isToday ? <span className="calendar-day__today-mark">●</span> : null}
              </div>
              <div className="calendar-day__badges">
                {day.topCategories.map(([category], index) => (
                  <span key={`${category}-${index}`} className="calendar-badge" title={category}>
                    {getCategoryIcon(category)}
                  </span>
                ))}
                {day.extraCategoryCount > 0 ? <span className="calendar-badge calendar-badge--more">+{day.extraCategoryCount}</span> : null}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CalendarPage;
