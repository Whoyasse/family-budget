import { useEffect, useState } from 'react';
import { getNextCategoryColor } from '../utils/categoryColors';

const ICONS = ['🛒', '🍔', '☕', '⛽', '🚬', '🏠', '🚗', '💊', '👕', '🎮', '📦', '💼', '💰', '🎁', '📈', '🏦', '✈️', '🐶'];

function CategoryManagerSheet({ categories, budgets, selectedMonth, onChange, onSaveCategory, onClose, onStatus, onDeleteCategory, onUpdateLimit }) {
  const [editingId, setEditingId] = useState(null);
  const [draftLimit, setDraftLimit] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const editing = categories.find((category) => category.id === editingId);

  useEffect(() => {
    setDraftLimit(editing ? String(budgets?.[editing.id]?.monthlyOverrides?.[selectedMonth] ?? '') : '');
  }, [editingId, editing?.id, budgets, selectedMonth]);

  const updateDraft = (changes) => onChange(categories.map((category) => category.id === editingId ? { ...category, ...changes } : category));

  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return onStatus('Введите название категории');
    if (categories.some((category) => category.id !== editing.id && category.type === editing.type && category.name.toLowerCase() === name.toLowerCase())) {
      return onStatus('Категория с таким названием уже есть');
    }
    try {
      setIsSaving(true);
      const saved = await onSaveCategory({ ...editing, name, label: name, previousNames: Array.from(new Set([...(editing.previousNames || []), name])) });
      if (editing.type === 'expense') await onUpdateLimit(saved.id, draftLimit);
      setEditingId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const create = () => {
    const category = { id: `category-${Date.now()}`, name: '', label: '', icon: '📦', color: getNextCategoryColor(categories), type: 'expense', archived: false, previousNames: [] };
    onChange([...categories, category]);
    setEditingId(category.id);
  };

  if (editing) {
    return (
      <div className="sheet-backdrop" onClick={() => setEditingId(null)}>
        <section className="sheet-card category-manager-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-handle" />
          <div className="topbar"><h3>{editing.name ? 'Изменить категорию' : 'Новая категория'}</h3><button className="ghost-btn" type="button" onClick={() => setEditingId(null)}>Закрыть</button></div>
          <label className="field"><span>Название</span><input autoFocus value={editing.name} onChange={(event) => updateDraft({ name: event.target.value, label: event.target.value })} /></label>
          <div className="choice-grid">
            <button type="button" className={editing.type === 'expense' ? 'active' : ''} onClick={() => updateDraft({ type: 'expense' })}>Расход</button>
            <button type="button" className={editing.type === 'income' ? 'active' : ''} onClick={() => updateDraft({ type: 'income' })}>Доход</button>
          </div>
          <div className="icon-picker">{ICONS.map((icon) => <button key={icon} className={editing.icon === icon ? 'active' : ''} type="button" onClick={() => updateDraft({ icon })}>{icon}</button>)}</div>
          {editing.type === 'expense' ? <label className="field"><span>Лимит на {selectedMonth}</span><input type="number" min="0" inputMode="decimal" value={draftLimit} placeholder="Не задан" onChange={(event) => setDraftLimit(event.target.value)} /><small className="form-help">Лимит действует только для выбранного месяца.</small></label> : null}
          <button className="primary-btn" type="button" disabled={isSaving} onClick={save}>{isSaving ? 'Сохраняем…' : 'Сохранить'}</button>
          {editing.name ? <button className="text-action danger" type="button" disabled={isSaving} onClick={() => setIsDeleteConfirmOpen(true)}>Удалить категорию</button> : null}
          {isDeleteConfirmOpen ? <div className="inline-confirm"><strong>Удалить «{editing.name}»?</strong><p>Старые операции сохранятся в истории с названием удалённой категории.</p><div><button type="button" className="ghost-btn" onClick={() => setIsDeleteConfirmOpen(false)}>Отмена</button><button type="button" className="danger-btn" onClick={async () => { setIsSaving(true); try { await onDeleteCategory(editing); setEditingId(null); } finally { setIsSaving(false); } }}>Удалить</button></div></div> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet-card category-manager-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="topbar"><div><p className="eyebrow">Категории</p><h3>Управление категориями</h3></div><button className="ghost-btn" type="button" onClick={onClose}>Закрыть</button></div>
        <p className="category-manager-hint">Чтобы изменить лимит категории, нажмите на нужную категорию.</p>
        <div className="category-list">{categories.filter((category) => !category.archived).map((category) => <button className="category-link-row category-manager-row" type="button" key={category.id} onClick={() => setEditingId(category.id)}><span className="category-icon">{category.icon}</span><div><strong>{category.name}</strong><p>{category.type === 'expense' ? 'Расход' : 'Доход'}</p></div><span className="category-row__chevron" aria-hidden="true">›</span></button>)}</div>
        <button className="primary-btn" type="button" onClick={create}>+ Добавить категорию</button>
      </section>
    </div>
  );
}

export default CategoryManagerSheet;
