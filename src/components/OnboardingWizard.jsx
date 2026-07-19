import { useState } from 'react';
import { createDefaultCategories } from '../utils/categoryStorage';

export const AVATARS = ['👨', '👩', '🧑', '👱‍♂️', '👱‍♀️', '🐶', '🐱', '🐻', '🦊', '🐼', '🐸', '🦁'];

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('EUR');
  const [balance, setBalance] = useState('');
  const [firstUser, setFirstUser] = useState({ name: '', avatar: '🧑' });
  const [addSecond, setAddSecond] = useState(false);
  const [secondUser, setSecondUser] = useState({ name: '', avatar: '🧑' });
  const [categories, setCategories] = useState(() => createDefaultCategories().map((category) => ({ ...category, archived: true })));
  const [custom, setCustom] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [completionError, setCompletionError] = useState('');

  const users = [firstUser, ...(addSecond ? [secondUser] : [])].map((user) => ({ ...user, archived: false }));
  const toggleCategory = (id) => setCategories((current) => current.map((category) => category.id === id ? { ...category, archived: !category.archived } : category));
  const addCategory = (type) => {
    const name = custom.trim();
    if (!name) return;
    setCategories((current) => [...current, { id: `category-${Date.now()}`, name, label: name, icon: '📦', type, archived: false, previousNames: [name], createdAt: new Date().toISOString() }]);
    setCustom('');
  };
  const categoryStep = (type, title) => <><h2>{title}</h2><p className="muted">Выберите подходящие варианты — их можно изменить позже.</p><div className="category-grid">{categories.filter((item) => item.type === type).map((item) => <button key={item.id} type="button" className={`category-btn ${item.archived ? '' : 'active'}`} aria-pressed={!item.archived} onClick={() => toggleCategory(item.id)}><span>{item.icon}</span><strong>{item.name}</strong></button>)}</div><div className="onboarding-custom-category"><input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Своя категория" /><button className="ghost-btn" type="button" onClick={() => addCategory(type)}>Добавить</button></div></>;
  const userEditor = (user, setUser, title) => <><h2>{title}</h2><p className="muted">Имя будет видно в операциях вашей семьи.</p><input value={user.name} onChange={(event) => setUser({ ...user, name: event.target.value })} placeholder="Введите имя" /><div className="avatar-picker">{AVATARS.map((avatar) => <button key={avatar} type="button" className={user.avatar === avatar ? 'active' : ''} onClick={() => setUser({ ...user, avatar })}>{avatar}</button>)}</div></>;
  const canContinue = !((step === 3 && !firstUser.name.trim()) || (step === 5 && !categories.some((item) => item.type === 'income' && !item.archived)) || (step === 6 && !categories.some((item) => item.type === 'expense' && !item.archived)));
  const finish = async () => {
    setFinishing(true);
    setCompletionError('');
    try { await onComplete({ baseCurrency: currency, currency, balance: Number(String(balance).replace(',', '.')) || 0, users, categories: categories.filter((item) => !item.archived) }); }
    catch (error) { console.error(error); setCompletionError(error.message || 'Не удалось сохранить настройку семьи. Попробуйте ещё раз.'); }
    finally { setFinishing(false); }
  };

  const content = step === 1 ? <><h2>Выберите валюту</h2><p className="muted">Она будет использоваться для отображения сумм.</p><div className="choice-grid">{['EUR', 'USD', 'RUB', 'PLN', 'UAH'].map((item) => <button key={item} type="button" className={currency === item ? 'active' : ''} onClick={() => setCurrency(item)}>{item}</button>)}</div></>
    : step === 2 ? <><h2>Начальный баланс</h2><p className="muted">Можно оставить 0 и изменить позже.</p><input type="number" inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0,00" /></>
      : step === 3 ? userEditor(firstUser, setFirstUser, 'Первый участник')
        : step === 4 ? <><h2>Добавить второго?</h2><p className="muted">Этот шаг можно пропустить.</p><label className="onboarding-check"><input type="checkbox" checked={addSecond} onChange={(event) => setAddSecond(event.target.checked)} /> Добавить ещё участника</label>{addSecond && userEditor(secondUser, setSecondUser, 'Второй участник')}</>
          : step === 5 ? categoryStep('income', 'Выберите категории доходов')
            : step === 6 ? categoryStep('expense', 'Выберите категории расходов')
              : <><h2>Всё готово</h2><p className="muted">Проверьте настройки и нажмите «Начать». Всё можно изменить позже.</p>{completionError && <p className="onboarding-error" role="alert">{completionError}</p>}</>;

  return <main className="onboarding-shell"><section className="card onboarding-card"><header className="onboarding-header"><p className="eyebrow">Настройка семьи</p><span>Шаг {step} из 7</span></header><div className="onboarding-step">{content}</div><footer className="onboarding-actions">{step > 1 ? <button className="ghost-btn" type="button" onClick={() => setStep((current) => current - 1)} disabled={finishing}>Назад</button> : <span />}{step < 7 ? <button className="primary-btn" type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Продолжить</button> : <button className="primary-btn" type="button" disabled={finishing} onClick={finish}>{finishing ? 'Сохраняем…' : 'Начать'}</button>}</footer></section></main>;
}

export default OnboardingWizard;
