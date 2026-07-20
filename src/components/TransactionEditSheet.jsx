function TransactionEditSheet({ form, transaction, users, categories, currencyLabel, isSubmitting, isRateLoading, onChange, onCategorySelect, onClose, onSubmit }) {
  const availableCategories = categories.filter((category) => !category.archived && category.type === (form.type === 'Расход' ? 'expense' : 'income'));
  const amount = Number(String(form.amount || '').replace(',', '.'));
  const canSave = Number.isFinite(amount) && amount > 0 && form.person && form.category;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet-card transaction-edit-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">Редактирование</p>
            <h3>Изменить операцию</h3>
            {transaction ? <p className="transaction-edit-context">{transaction.type} · {transaction.date}{transaction.time ? `, ${transaction.time}` : ''}</p> : null}
          </div>
          <button className="ghost-btn" type="button" onClick={onClose}>Закрыть</button>
        </div>
        <form className="stack transaction-edit-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Участник</span>
            <select name="person" value={form.person} onChange={onChange}>
              {users.map((user) => <option key={user.id} value={user.name}>{user.avatar} {user.name}</option>)}
            </select>
          </label>
          {form.amount !== '' && !canSave ? <p className="field-error">Введите сумму больше нуля и выберите участника и категорию.</p> : null}
          <label className="field">
            <span>Категория</span>
            <select name="category" value={form.category} onChange={(event) => onCategorySelect(event.target.value)}>
              {availableCategories.map((category) => <option key={category.id} value={category.name}>{category.icon} {category.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Сумма в {currencyLabel}</span>
            <input name="amount" type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={onChange} autoFocus />
          </label>
          <label className="field">
            <span>Комментарий <small>(необязательно)</small></span>
            <textarea name="comment" rows={3} maxLength={400} placeholder="Например, супермаркет" value={form.comment ?? ''} onChange={onChange} />
          </label>
          <button className="primary-btn" type="submit" disabled={!canSave || isSubmitting || isRateLoading}>
            {isSubmitting ? 'Сохраняю…' : 'Сохранить изменения'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default TransactionEditSheet;
