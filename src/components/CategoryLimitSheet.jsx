import { useEffect, useState } from 'react';

function CategoryLimitSheet({ category, monthLabel, spent, limit, percent, formatCurrency, onSave, onRemove, onClose }) {
  const [value, setValue] = useState(limit ? String(limit) : '');
  useEffect(() => setValue(limit ? String(limit) : ''), [limit, category?.id]);
  if (!category) return null;
  const exceeded = limit && spent >= limit;
  const remaining = limit ? Math.abs(limit - spent) : null;
  return <div className="sheet-backdrop" onClick={onClose}><section className="sheet-card category-limit-sheet" onClick={(event) => event.stopPropagation()}>
    <div className="sheet-handle" /><div className="topbar"><div><p className="eyebrow">Лимит категории</p><h3>{category.icon} {category.name}</h3></div><button className="ghost-btn" type="button" onClick={onClose}>Закрыть</button></div>
    <p className="muted">{monthLabel}</p><div className="limit-sheet-summary"><strong>{formatCurrency(spent)}</strong>{limit ? <span>из {formatCurrency(limit)} · {percent.toFixed(0)}%</span> : <span>Лимит не задан</span>}</div>
    {limit ? <p className={exceeded ? 'negative' : 'positive'}>{exceeded ? `Превышение на ${formatCurrency(remaining)}` : `Осталось ${formatCurrency(remaining)}`}</p> : null}
    <div className="progress-bar"><div className={`progress-fill ${exceeded ? 'limit-exceeded' : ''}`} style={{ width: `${Math.min(100, percent || 0)}%` }} /></div>
    <label className="field"><span>Лимит на выбранный месяц</span><input autoFocus type="number" min="0" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Например, 400" /></label>
    <button className="primary-btn" type="button" onClick={() => onSave(value)}>Сохранить</button>{limit ? <button className="text-action danger" type="button" onClick={onRemove}>Убрать лимит</button> : null}
  </section></div>;
}

export default CategoryLimitSheet;
