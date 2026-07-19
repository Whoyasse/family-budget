const CACHE_KEY = 'family-budget-exchange-rates';
const CACHE_TTL = 6 * 60 * 60 * 1000;

export async function getExchangeRate(from, to) {
  if (from === to) return 1;
  const cacheKey = `${from}-${to}`;
  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}')[cacheKey];
    if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.rate;
  } catch { /* Fetch a fresh rate. */ }

  const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  if (!response.ok) throw new Error('Не удалось получить курс валют');
  const data = await response.json();
  const rate = Number(data?.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Курс валют недоступен');

  let cache = {};
  try { cache = JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}'); } catch { /* Start a new cache. */ }
  window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, [cacheKey]: { rate, savedAt: Date.now(), date: data.date } }));
  return rate;
}
