import { useState } from 'react';
import { ACCENTS, THEMES } from '../utils/settingsStorage';
import { AVATARS } from '../components/OnboardingWizard';

function SettingsPage({ startBalance, exchangeRate, onSaveBalance, settings, onSettingsChange, users, household, onUpdateHouseholdName, onCreateUser, onUpdateUser, onDeleteUser, onExport, onRestartOnboarding, onStatus, onManageCategories, onSignOut }) {
  const [balanceInput, setBalanceInput] = useState(String((startBalance ?? 0) * (exchangeRate || 1)));
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [familyName, setFamilyName] = useState(household?.name || '');
  const [editingUserId, setEditingUserId] = useState(null);
  const [draftUser, setDraftUser] = useState(null);
  const [savingFamily, setSavingFamily] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);

  const saveFamilyName = async () => {
    try {
      setSavingFamily(true);
      await onUpdateHouseholdName(familyName);
      setIsEditingFamily(false);
      onStatus('Название семьи сохранено');
    } catch (error) {
      console.error(error);
      onStatus('Не удалось сохранить название семьи. Попробуйте ещё раз.');
    } finally { setSavingFamily(false); }
  };

  const saveUser = async () => {
    if (!draftUser?.name.trim()) return;
    try {
      setSavingUser(true);
      if (editingUserId === 'new') await onCreateUser(draftUser);
      else await onUpdateUser(editingUserId, draftUser);
      setEditingUserId(null);
      setDraftUser(null);
      onStatus('✓ Участник сохранён');
    } catch (error) {
      console.error(error);
      onStatus('Не удалось сохранить участника. Попробуйте ещё раз.');
    } finally {
      setSavingUser(false);
    }
  };

  const addUser = () => { setDraftUser({ name: '', avatar: '🧑' }); setEditingUserId('new'); };

  return <div className="screen settings-screen"><header className="topbar"><div><p className="eyebrow">Профиль и приложение</p><h2>Настройки</h2></div></header>
    <section className="card settings-section"><div className="section-title"><h4>Валюта и баланс</h4></div><form className="settings-inline-form" onSubmit={async (event) => { event.preventDefault(); if (savingBalance) return; setSavingBalance(true); try { await onSaveBalance((Number(String(balanceInput).replace(',', '.')) || 0) / (exchangeRate || 1)); onStatus('✓ Начальный баланс сохранён'); } catch { onStatus('Не удалось сохранить баланс. Попробуйте ещё раз.'); } finally { setSavingBalance(false); } }}><input type="number" inputMode="decimal" value={balanceInput} onChange={(event) => setBalanceInput(event.target.value)} /><button className="primary-btn" disabled={!exchangeRate || savingBalance}>{savingBalance ? 'Сохраняем…' : 'Сохранить'}</button></form></section>
    <section className="card settings-section"><div className="section-title"><h4>Валюта</h4></div><div className="choice-grid currency-grid">{['EUR', 'USD', 'RUB', 'PLN', 'UAH'].map((currency) => <button key={currency} type="button" className={settings.currency === currency ? 'active' : ''} onClick={() => onSettingsChange({ ...settings, currency })}>{currency}</button>)}</div></section>
    <section className="card settings-section"><div className="section-title"><h4>Учётная валюта</h4></div><p className="muted">В этой валюте суммы хранятся в таблице. Отображение можно менять отдельно.</p><div className="choice-grid currency-grid">{['EUR', 'USD', 'RUB', 'PLN', 'UAH'].map((currency) => <button key={currency} type="button" className={settings.baseCurrency === currency ? 'active' : ''} onClick={() => { if (currency === settings.baseCurrency || window.confirm(`Считать все существующие суммы валютой ${currency}? Это не пересчитывает таблицу.`)) onSettingsChange({ ...settings, baseCurrency: currency }); }}>{currency}</button>)}</div></section>
    <section className="card settings-section"><div className="section-title"><h4>Акцент</h4></div><div className="accent-grid">{Object.entries(ACCENTS).map(([id, accent]) => <button key={id} type="button" className={settings.accent === id ? 'active' : ''} onClick={() => onSettingsChange({ ...settings, accent: id })}><i style={{ background: accent.primary }} />{accent.label}</button>)}<label className={`custom-accent-picker ${settings.accent === 'custom' ? 'active' : ''}`}><i className="color-wheel" /><span>Свой цвет</span><input aria-label="Выбрать свой акцент" type="color" value={settings.customAccent || '#2fcf72'} onChange={(event) => onSettingsChange({ ...settings, accent: 'custom', customAccent: event.target.value })} /></label></div></section>
    <section className="card settings-section"><div className="section-title"><h4>Тема</h4></div><div className="choice-grid theme-grid">{Object.entries(THEMES).map(([id, theme]) => <button key={id} type="button" className={settings.theme === id ? 'active' : ''} onClick={() => onSettingsChange({ ...settings, theme: id })}>{id === 'dark' ? '🌙' : '☀️'} {theme.label}</button>)}</div></section>
    <section className="card family-section"><div className="section-title"><div><p className="eyebrow">Семья</p><h4>{household?.name || 'Моя семья'}</h4></div><button className="text-action" type="button" onClick={() => { setFamilyName(household?.name || ''); setIsEditingFamily(true); }}>Редактировать</button></div>{isEditingFamily && <div className="family-name-editor"><input value={familyName} onChange={(event) => setFamilyName(event.target.value)} placeholder="Название семьи" /><button className="primary-btn" type="button" onClick={saveFamilyName} disabled={savingFamily}>{savingFamily ? 'Сохраняю…' : 'Сохранить'}</button><button className="ghost-btn" type="button" onClick={() => setIsEditingFamily(false)}>Отмена</button></div>}<div className="section-title"><h4>Участники</h4><button className="text-action" type="button" onClick={addUser}>Добавить участника</button></div><div className="settings-users">{users.map((user) => <div className="settings-user" key={user.id}>{editingUserId === user.id ? <><input value={draftUser?.name ?? user.name} onChange={(event) => setDraftUser({ ...(draftUser || user), name: event.target.value })} /><div className="avatar-picker compact">{AVATARS.map((avatar) => <button key={avatar} type="button" className={(draftUser?.avatar ?? user.avatar) === avatar ? 'active' : ''} onClick={() => setDraftUser({ ...(draftUser || user), avatar })}>{avatar}</button>)}</div><button className="primary-btn" type="button" onClick={saveUser}>Готово</button></> : <><span className="settings-user-avatar">{user.avatar}</span><strong>{user.name}</strong><button className="text-action" type="button" onClick={() => { setDraftUser(user); setEditingUserId(user.id); }}>Изменить</button><button className="text-action danger" type="button" onClick={() => onDeleteUser(user)}>Удалить</button></>}</div>)}{editingUserId === 'new' && <div className="settings-user settings-user--editor"><input autoFocus value={draftUser?.name || ''} onChange={(event) => setDraftUser({ ...(draftUser || {}), name: event.target.value })} placeholder="Имя участника" /><div className="avatar-picker compact">{AVATARS.map((avatar) => <button key={avatar} type="button" className={draftUser?.avatar === avatar ? 'active' : ''} onClick={() => setDraftUser({ ...(draftUser || {}), avatar })}>{avatar}</button>)}</div><button className="primary-btn" type="button" onClick={saveUser}>Добавить</button><button className="ghost-btn" type="button" onClick={() => { setEditingUserId(null); setDraftUser(null); }}>Отмена</button></div>}{!users.length && editingUserId !== 'new' && <p className="muted">Добавьте первого участника семьи.</p>}</div></section>
    <section className="card settings-section"><div className="section-title"><h4>Категории</h4></div><button className="primary-btn settings-wide-btn" type="button" onClick={onManageCategories}>Управление категориями</button></section>
    <section className="card settings-section"><h4>Данные</h4><button className="primary-btn settings-wide-btn" type="button" onClick={onExport}>Экспорт в Excel</button><button className="text-action" type="button" onClick={() => { if (window.confirm('Перезапустить первоначальную настройку?')) onRestartOnboarding(); }}>Пройти настройку заново</button><button className="text-action danger" type="button" onClick={onSignOut}>Выйти из аккаунта</button></section>
  </div>;
}

export default SettingsPage;
