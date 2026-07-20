const CACHE_KEY = 'family-budget:exchange-rates:v2';
export const EXCHANGE_RATE_TTL = 60 * 60 * 1000;
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'RUB', 'PLN', 'UAH'];

let requestInFlight = null;

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function isValidSnapshot(value) {
  return value
    && typeof value === 'object'
    && typeof value.base === 'string'
    && Number.isFinite(value.savedAt)
    && value.rates
    && typeof value.rates === 'object';
}

export function readExchangeRateCache() {
  if (!canUseStorage()) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveExchangeRateCache(snapshot) {
  if (!canUseStorage()) return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch { /* Cache is optional. */ }
}

export function isExchangeRateCacheFresh(snapshot, now = Date.now()) {
  return Boolean(snapshot && now - snapshot.savedAt < EXCHANGE_RATE_TTL);
}

export async function getExchangeRates(base, { force = false } = {}) {
  const normalizedBase = String(base || '').toUpperCase();
  const cached = readExchangeRateCache();
  if (!force && cached?.base === normalizedBase && isExchangeRateCacheFresh(cached)) return cached;
  if (requestInFlight?.base === normalizedBase) return requestInFlight.promise;

  const promise = fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(normalizedBase)}`)
    .then(async (response) => {
      if (!response.ok) throw new Error('Не удалось получить курс валют');
      const data = await response.json();
      const rates = Object.fromEntries(SUPPORTED_CURRENCIES
        .filter((currency) => currency !== normalizedBase)
        .map((currency) => [currency, Number(data?.rates?.[currency])])
        .filter(([, rate]) => Number.isFinite(rate) && rate > 0));
      if (!Object.keys(rates).length) throw new Error('Курсы валют недоступны');
      const snapshot = { version: 2, base: normalizedBase, rates, savedAt: Date.now(), sourceDate: data?.time_last_update_utc || data?.date || null };
      saveExchangeRateCache(snapshot);
      return snapshot;
    })
    .finally(() => { requestInFlight = null; });
  requestInFlight = { base: normalizedBase, promise };
  return promise;
}

export async function getExchangeRate(from, to) {
  if (from === to) return 1;
  const snapshot = await getExchangeRates(from);
  const rate = Number(snapshot.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Курс валют недоступен');
  return rate;
}
