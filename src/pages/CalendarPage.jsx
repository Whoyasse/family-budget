import { getCalendarHeatColor } from '../data/calendarHeat';

function CalendarPage({
  selectedMonth,
  onPrevMonth,
  onCurrentMonth,
  onNextMonth,
  calendarDays,
  onSelectDay,
  getMonthLabel
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
              className={`calendar-day ${day.isCurrentMonth ? '' : 'is-muted'} ${day.isToday ? 'is-today' : ''} ${day.transactionCount > 0 ? 'has-operations' : ''}`}
              onClick={() => onSelectDay(day)}
              style={day.transactionCount > 0 ? { '--calendar-heat': getCalendarHeatColor(day.transactionCount) } : undefined}
              aria-label={`${day.day} ${getMonthLabel(selectedMonth)}${day.transactionCount ? `: ${day.transactionCount} ${day.transactionCount === 1 ? 'операция' : day.transactionCount < 5 ? 'операции' : 'операций'}` : ', операций нет'}`}
            >
              <div className="calendar-day__header">
                <span className="calendar-day__number">{day.day}</span>
                {day.isToday ? <span className="calendar-day__today-mark">●</span> : null}
              </div>
              {day.transactionCount > 0 ? <span className="calendar-day__count">{day.transactionCount}</span> : null}
            </button>
          ))}
        </div>
        <div className="calendar-heat-legend" aria-label="Чем ярче цвет, тем больше операций за день"><span>Меньше</span><i className="heat-level-1" /><i className="heat-level-2" /><i className="heat-level-3" /><i className="heat-level-4" /><span>Больше</span></div>
      </section>
    </div>
  );
}

export default CalendarPage;
