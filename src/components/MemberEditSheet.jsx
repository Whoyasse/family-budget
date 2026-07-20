import { useEffect, useRef } from 'react';
import { AVATARS } from './OnboardingWizard';

function MemberEditSheet({ draft, isSaving, onChange, onSave, onDelete, onClose, returnFocusRef }) {
  const nameInputRef = useRef(null);
  const touchStartY = useRef(null);
  const isExistingMember = Boolean(draft.id);
  const canDelete = isExistingMember && !draft.authUserId;

  useEffect(() => {
    nameInputRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      returnFocusRef?.current?.focus();
    };
  }, []);

  return (
    <div className="sheet-backdrop member-edit-backdrop" onClick={onClose}>
      <section
        aria-labelledby="member-edit-title"
        aria-modal="true"
        className="sheet-card member-edit-sheet"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => { touchStartY.current = event.clientY; }}
        onPointerUp={(event) => {
          if (touchStartY.current !== null && event.clientY - touchStartY.current > 80) onClose();
          touchStartY.current = null;
        }}
        role="dialog"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="member-edit-header">
          <div>
            <p className="eyebrow">{isExistingMember ? 'Редактирование участника' : 'Новый участник'}</p>
            <h3 id="member-edit-title">{isExistingMember ? 'Редактирование участника' : 'Добавить участника'}</h3>
            <p className="muted">Измените имя и аватар участника бюджета.</p>
          </div>
          <button aria-label="Закрыть" className="member-edit-close" type="button" onClick={onClose}>×</button>
        </header>
        <div className="member-edit-content">
          <label className="field">
            <span>Имя</span>
            <input ref={nameInputRef} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          </label>
          <div className="member-avatar-section">
            <span className="field-label">Аватар</span>
            <div className="avatar-picker compact" aria-label="Выберите аватар">
              {AVATARS.map((avatar) => <button aria-label={`Аватар ${avatar}`} key={avatar} type="button" className={draft.avatar === avatar ? 'active' : ''} onClick={() => onChange({ ...draft, avatar })}>{avatar}</button>)}
            </div>
          </div>
        </div>
        <footer className="member-edit-actions">
          <button className="primary-btn" type="button" disabled={isSaving} onClick={onSave}>{isSaving ? 'Сохраняем…' : 'Сохранить'}</button>
          <button className="ghost-btn" type="button" disabled={isSaving} onClick={onClose}>Отмена</button>
          {canDelete ? <button className="danger-btn" type="button" disabled={isSaving} onClick={onDelete}>Удалить</button> : null}
        </footer>
      </section>
    </div>
  );
}

export default MemberEditSheet;
