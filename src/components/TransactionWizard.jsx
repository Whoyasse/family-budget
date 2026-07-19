import { useEffect, useRef, useState } from 'react';

const TOTAL_STEPS = 5;

function TransactionWizard({
  form,
  isEditing,
  isSubmitting,
  loading,
  users,
  currencyLabel,
  isRateLoading,
  categoryOptions,
  onChange,
  onCategorySelect,
  onClose,
  onSubmit,
  onReceiptClick
}) {
  const [step, setStep] = useState(1);
  const amountInputRef = useRef(null);
  const touchStartYRef = useRef(null);
  const amount = Number(String(form.amount || '').replace(',', '.'));
  const canContinue = Number.isFinite(amount) && amount > 0;

  useEffect(() => {
    if (step !== 4) return undefined;
    const timer = window.setTimeout(() => amountInputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [step]);

  const selectValue = (name, value, nextStep) => {
    if (form[name] !== value) {
      onChange({ target: { name, value } });
    }
    setStep(nextStep);
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="wizard-step">
          <h3>Кто совершил операцию?</h3>
          <div className="wizard-choice-grid">
            {users.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`wizard-choice ${form.person === person.name ? 'active' : ''}`}
                onClick={() => selectValue('person', person.name, 2)}
              >
                <span className="wizard-choice__icon">{person.avatar}</span>
                <strong>{person.name}</strong>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="wizard-step">
          <h3>Что это?</h3>
          <div className="wizard-choice-grid">
            {['Расход', 'Доход'].map((type) => (
              <button
                key={type}
                type="button"
                className={`wizard-choice ${form.type === type ? 'active' : ''}`}
                onClick={() => selectValue('type', type, 3)}
              >
                <span className="wizard-choice__icon">{type === 'Расход' ? '↘' : '↗'}</span>
                <strong>{type}</strong>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="wizard-step">
          <h3>Выберите категорию</h3>
          <div className="category-grid wizard-category-grid">
            {categoryOptions.map((category) => (
              <button
                key={category.label}
                type="button"
                className="category-btn"
                onClick={() => {
                  onCategorySelect(category.label);
                  setStep(4);
                }}
              >
                <span>{category.icon}</span>
                <strong>{category.label}</strong>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="wizard-step wizard-amount-step">
          <h3>Введите сумму</h3>
          <label className="field wizard-amount-field">
            <span>Сумма операции в {currencyLabel}</span>
            <input
              ref={amountInputRef}
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={form.amount}
              onChange={onChange}
            />
          </label>
          <button className="primary-btn wizard-primary" type="button" disabled={!canContinue || isRateLoading} onClick={() => setStep(5)}>
            {isRateLoading ? 'Загружаю курс…' : 'Продолжить'}
          </button>
        </div>
      );
    }

    return (
      <div className="wizard-step">
        <h3>Детали операции</h3>
        <label className="field">
          <span>Комментарий <small>(необязательно)</small></span>
          <input
            name="comment"
            type="text"
            placeholder="Например, супермаркет"
            value={form.comment}
            onChange={onChange}
          />
        </label>
        <button className="receipt-placeholder-btn" type="button" onClick={onReceiptClick}>
          📎 Прикрепить чек
        </button>
        <button className="primary-btn wizard-primary" type="submit" disabled={loading || isSubmitting || isRateLoading}>
          {isSubmitting ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </div>
    );
  };

  return (
    <div className="sheet-backdrop wizard-backdrop" onClick={onClose}>
      <div
        className={`sheet-card wizard-sheet wizard-sheet--step-${step}`}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0].clientY;
        }}
        onTouchEnd={(event) => {
          if (touchStartYRef.current === null) return;
          const deltaY = event.changedTouches[0].clientY - touchStartYRef.current;
          if (deltaY > 90) onClose();
          touchStartYRef.current = null;
        }}
      >
        <div className="sheet-handle" />
        <div className="sheet-header wizard-header">
          <div>
            <p className="eyebrow">Шаг {step} из {TOTAL_STEPS}</p>
            <strong>{isEditing ? 'Изменить операцию' : 'Новая операция'}</strong>
          </div>
          <button className="ghost-btn" type="button" onClick={onClose}>Закрыть</button>
        </div>

        <div className="wizard-progress" aria-hidden="true">
          <span style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <form
          className="wizard-form"
          onSubmit={(event) => {
            if (step !== 5) {
              event.preventDefault();
              return;
            }
            onSubmit(event);
          }}
        >
          {step > 1 ? (
            <button className="wizard-back" type="button" onClick={() => setStep((current) => current - 1)}>
              ← Назад
            </button>
          ) : null}
          {renderStep()}
        </form>
      </div>
    </div>
  );
}

export default TransactionWizard;
