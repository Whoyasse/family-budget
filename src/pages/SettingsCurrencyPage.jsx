import { useEffect, useMemo, useRef, useState } from 'react';
import { EXCHANGE_RATE_TTL, getExchangeRates, readExchangeRateCache, SUPPORTED_CURRENCIES } from '../utils/exchangeRates';

const formatUpdatedAt = (timestamp) => timestamp ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' }).format(new Date(timestamp)) : '';

function SettingsCurrencyPage({ startBalance, exchangeRate, settings, onSettingsChange, onSaveBalance, onBack, onStatus }) {
  const [balanceInput, setBalanceInput] = useState(String((startBalance ?? 0) * (exchangeRate || 1)));
  const [savingBalance, setSavingBalance] = useState(false);
  const [snapshot, setSnapshot] = useState(() => readExchangeRateCache());
  const [ratesError, setRatesError] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setBalanceInput(String((startBalance ?? 0) * (exchangeRate || 1))); }, [startBalance, exchangeRate]);
  const loadRates = async (force = false) => {
    try { const result = await getExchangeRates(settings.baseCurrency, { force }); setSnapshot(result); setRatesError(false); }
    catch (error) { console.error('exchange rates', error); setRatesError(true); }
  };
  useEffect(() => {
    void loadRates();
    const onVisibility = () => { if (!document.hidden) void loadRates(); };
    timerRef.current = window.setInterval(() => { void loadRates(); }, EXCHANGE_RATE_TTL);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timerRef.current); document.removeEventListener('visibilitychange', onVisibility); };
  }, [settings.baseCurrency]);

  const rates = useMemo(() => Object.entries(snapshot?.rates || {}).filter(([currency]) => currency !== settings.baseCurrency), [snapshot, settings.baseCurrency]);
  const isStale = snapshot && Date.now() - snapshot.savedAt >= EXCHANGE_RATE_TTL;
  return <div className="screen settings-screen settings-detail-screen">
    <header className="topbar"><button className="back-btn" aria-label="Вернуться к настройкам" type="button" onClick={onBack}>← Назад</button><div><p className="eyebrow">Настройки</p><h2>Валюта и баланс</h2></div></header>
    <section className="card settings-section"><div className="section-title"><h4>Стартовый баланс</h4><span className="currency-pill">{settings.currency}</span></div><form className="settings-inline-form" onSubmit={async (event) => { event.preventDefault(); if (savingBalance) return; setSavingBalance(true); try { await onSaveBalance((Number(String(balanceInput).replace(',', '.')) || 0) / (exchangeRate || 1)); onStatus('✓ Начальный баланс сохранён'); } catch { onStatus('Не удалось сохранить баланс. Попробуйте ещё раз.'); } finally { setSavingBalance(false); } }}><input aria-label="Начальный баланс" type="number" inputMode="decimal" value={balanceInput} onChange={(event) => setBalanceInput(event.target.value)} /><button className="primary-btn" disabled={!exchangeRate || savingBalance}>{savingBalance ? 'Сохраняем…' : 'Сохранить'}</button></form></section>
    <section className="card settings-section"><h4>Валюта отображения</h4><p className="muted">Используется для отображения сумм в приложении. Исходные суммы операций при этом не изменяются.</p><div className="choice-grid currency-grid">{SUPPORTED_CURRENCIES.map((currency) => <button key={currency} type="button" className={settings.currency === currency ? 'active' : ''} onClick={() => onSettingsChange({ ...settings, currency })}>{currency}</button>)}</div></section>
    <section className="card settings-section"><h4>Учётная валюта</h4><p className="muted">В этой валюте сохраняются суммы операций и рассчитывается общий баланс. Смена не пересчитывает уже сохранённые суммы.</p><div className="choice-grid currency-grid">{SUPPORTED_CURRENCIES.map((currency) => <button key={currency} type="button" className={settings.baseCurrency === currency ? 'active' : ''} onClick={() => { if (currency === settings.baseCurrency || window.confirm(`Считать все существующие суммы валютой ${currency}? Это не пересчитывает операции.`)) onSettingsChange({ ...settings, baseCurrency: currency }); }}>{currency}</button>)}</div></section>
    <section className="card settings-section exchange-rates"><div className="section-title"><h4>Актуальные курсы</h4>{snapshot ? <span className="exchange-rates__time">Обновлено: {formatUpdatedAt(snapshot.savedAt)}</span> : null}</div>{!snapshot && !ratesError ? <div className="exchange-rates__skeleton" aria-label="Загружаем курсы" /> : null}{rates.length ? <><p className="muted">1 {settings.baseCurrency} =</p><ul>{rates.map(([currency, rate]) => <li key={currency}><strong>{Number(rate).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} {currency}</strong></li>)}</ul>{isStale ? <p className="form-help">Данные могут быть устаревшими.</p> : <p className="form-help">Курсы обновляются автоматически примерно раз в час.</p>}</> : null}{ratesError ? <div className="exchange-rates__error"><p>{snapshot ? 'Не удалось обновить курсы. Показаны последние значения.' : 'Не удалось загрузить курсы валют.'}</p><button className="ghost-btn" type="button" onClick={() => void loadRates(true)}>Повторить попытку</button></div> : null}</section>
  </div>;
}
export default SettingsCurrencyPage;
