export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);

  const normalized = String(value).trim();
  if (!normalized) return null;

  const iso = normalized.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    const [, year, month, day] = iso;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parts = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (parts) {
    const [, day, month, year] = parts;
    const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
    return new Date(fullYear, Number(month) - 1, Number(day));
  }

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  return null;
}

export function parseTimeValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);

  const normalized = String(value).trim();
  if (!normalized) return null;

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const timeOnly = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeOnly) {
    const [, hours, minutes] = timeOnly;
    const base = new Date(2000, 0, 1, Number(hours), Number(minutes));
    return Number.isNaN(base.getTime()) ? null : base;
  }

  return null;
}

export function getMonthKey(date) {
  const parsed = parseDate(date);
  if (!parsed) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

export function formatTransactionDate(dateValue, timeValue) {
  const parsedDate = parseDate(dateValue);
  const parsedTime = parseTimeValue(timeValue);

  if (!parsedDate) {
    return '';
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());

  const dateLabel = startOfDate.getTime() === startOfToday.getTime()
    ? 'Сегодня'
    : startOfDate.getTime() === startOfYesterday.getTime()
      ? 'Вчера'
      : parsedDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (!parsedTime) {
    return dateLabel;
  }

  const timeLabel = parsedTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (dateLabel === 'Сегодня' || dateLabel === 'Вчера') {
    return `${dateLabel} ${timeLabel}`;
  }

  return `${dateLabel} ${timeLabel}`;
}
