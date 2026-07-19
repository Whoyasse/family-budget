import { useState } from 'react';

const ICONS = ['🛒', '🍔', '☕', '⛽', '🚬', '🏠', '🚗', '💊', '👕', '🎮', '📦', '💼', '💰', '🎁', '📈', '🏦', '✈️', '🐶'];

function CategoryManagerSheet({ categories, budgets, selectedMonth, formatCurrency, onChange, onClose, onStatus, onDeleteCategory, onUpdateLimit }) {
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const editing = categories.find((category) => category.id === editingId);
  const visible = categories.filter((category) => Boolean(category.archived) === showArchived);
  const save = (draft) => {
    const name = draft.name.trim();
    if (!name) return onStatus('Введите название категории');
    if (categories.some((category) => category.id !== draft.id && category.type === draft.type && category.name.toLowerCase() === name.toLowerCase())) return onStatus('Категория с таким названием уже есть');
    onChange(categories.map((category) => category.id === draft.id ? { ...draft, name, label: name, previousNames: Array.from(new Set([...(category.previousNames || []), category.name, name])) } : category));
    setEditingId(null);
  };
  const create = () => {
    const category = { id: `category-${Date.now()}`, name: '', label: '', icon: '📦', type: 'expense', archived: false, previousNames: [], createdAt: new Date().toISOString() };
    onChange([...categories, category]); setEditingId(category.id);
  };
  if (editing) { const limit = budgets?.[editing.id]?.defaultLimit ?? ''; return <div className="sheet-backdrop" onClick={() => setEditingId(null)}><section className="sheet-card category-manager-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="topbar"><h3>{editing.name ? 'Изменить категорию' : 'Новая категория'}</h3><button className="ghost-btn" type="button" onClick={() => setEditingId(null)}>Закрыть</button></div><label className="field"><span>Название</span><input autoFocus value={editing.name} onChange={(event) => onChange(categories.map((category) => category.id === editing.id ? { ...category, name: event.target.value } : category))} /></label><div className="choice-grid"><button type="button" className={editing.type === 'expense' ? 'active' : ''} onClick={() => editing.previousNames?.length ? onStatus('Нельзя менять тип категории с историей операций') : onChange(categories.map((category) => category.id === editing.id ? { ...category, type: 'expense' } : category))}>Расход</button><button type="button" className={editing.type === 'income' ? 'active' : ''} onClick={() => editing.previousNames?.length ? onStatus('Нельзя менять тип категории с историей операций') : onChange(categories.map((category) => category.id === editing.id ? { ...category, type: 'income' } : category))}>Доход</button></div><div className="icon-picker">{ICONS.map((icon) => <button key={icon} className={editing.icon === icon ? 'active' : ''} type="button" onClick={() => onChange(categories.map((category) => category.id === editing.id ? { ...category, icon } : category))}>{icon}</button>)}</div>{editing.type === 'expense' ? <label className="field"><span>Лимит на месяц</span><input type="number" min="0" inputMode="decimal" value={limit} placeholder="Не задан" onChange={(event) => onUpdateLimit(editing.id, event.target.value)} /></label> : null}<button className="primary-btn" type="button" onClick={() => save(editing)}>Сохранить</button><button className="text-action danger" type="button" onClick={() => { onDeleteCategory(editing); setEditingId(null); }}>🗑️ Полностью удалить</button></section></div>; }
  return <div className="sheet-backdrop" onClick={onClose}><section className="sheet-card category-manager-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="topbar"><div><p className="eyebrow">Категории</p><h3>Управление категориями</h3></div><button className="ghost-btn" type="button" onClick={onClose}>Закрыть</button></div><p className="category-manager-hint">Чтобы изменить лимит категории, нажмите на нужную категорию.</p><div className="category-list">{visible.map((category) => <div className="category-row category-manager-list-row" key={category.id}><button className="category-link-row category-manager-row" type="button" onClick={() => setEditingId(category.id)}><span className="category-icon">{category.icon}</span><div><strong>{category.name}</strong><p>{category.type === 'expense' ? 'Расход' : 'Доход'}</p></div></button><button className="category-delete-button" type="button" aria-label={`Удалить ${category.name}`} onClick={() => onDeleteCategory(category)}>🗑️</button></div>)}</div><button className="primary-btn" type="button" onClick={create}>+ Добавить категорию</button></section></div>;
}

export default CategoryManagerSheet;
