const SETTINGS_KEY = 'family-budget-settings';

export const DEFAULT_USERS = [];

export const ACCENTS = {
  green: {
    label: 'Зелёный', primary: '#2fcf72', bright: '#72f0a3', soft: 'rgba(47, 207, 114, 0.16)', onPrimary: '#ffffff',
    themes: {
      dark: { bgTop: '#153b2b', bgMid: '#081711', bgBottom: '#030806', surface: '#091813', surfaceRaised: '#123020', border: 'rgba(114, 240, 163, 0.22)', text: '#72f0a3', muted: '#a4bdb0', shadow: 'rgba(0, 0, 0, 0.28)' },
      light: { bgTop: '#eaf8ef', bgMid: '#dfeee5', bgBottom: '#d4e6dc', surface: '#fbfefc', surfaceRaised: '#eff9f2', border: 'rgba(31, 170, 91, 0.22)', text: '#17251d', muted: '#5e7466', shadow: 'rgba(24, 92, 52, 0.13)' }
    }
  }
};

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return { r: 47, g: 207, b: 114 };
  return { r: Number.parseInt(normalized.slice(0, 2), 16), g: Number.parseInt(normalized.slice(2, 4), 16), b: Number.parseInt(normalized.slice(4, 6), 16) };
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255; const green = g / 255; const blue = b / 255;
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const lightness = (max + min) / 2;
  if (max === min) return { h: 150, s: 0, l: lightness * 100 };
  const difference = max - min;
  const saturation = lightness > 0.5 ? difference / (2 - max - min) : difference / (max + min);
  let hue = max === red ? (green - blue) / difference + (green < blue ? 6 : 0) : max === green ? (blue - red) / difference + 2 : (red - green) / difference + 4;
  return { h: Math.round(hue * 60), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

const hsl = ({ h, s, l }, alpha) => alpha === undefined ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${alpha})`;
const contrastText = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) > 162 ? '#15181d' : '#ffffff';
};

export function createCustomAccent(hex) {
  const color = /^#[\da-f]{6}$/i.test(hex) ? hex : '#2fcf72';
  const base = rgbToHsl(hexToRgb(color));
  const isLightNeutral = base.l > 90;
  const isNeutral = base.s < 9 || base.l < 8 || isLightNeutral;
  if (isNeutral) {
    const accent = isLightNeutral ? '#ffffff' : color;
    const bright = isLightNeutral ? '#ffffff' : '#1f2937';
    const soft = isLightNeutral ? 'rgba(255, 255, 255, 0.16)' : 'rgba(31, 41, 55, 0.13)';
    return {
      label: 'Свой цвет', primary: accent, bright, soft, onPrimary: isLightNeutral ? '#15181d' : '#ffffff',
      themes: {
        dark: { bgTop: '#25272b', bgMid: '#111318', bgBottom: '#050608', surface: '#111318', surfaceRaised: '#1d2026', border: 'rgba(226, 232, 240, 0.26)', text: '#f8fafc', muted: '#b2b8c2', shadow: 'rgba(0, 0, 0, 0.32)' },
        light: { bgTop: '#f4f5f6', bgMid: '#e7e9ec', bgBottom: '#d9dde2', surface: '#ffffff', surfaceRaised: '#f4f5f7', border: 'rgba(17, 24, 39, 0.35)', text: '#15181d', muted: '#58616d', shadow: 'rgba(17, 24, 39, 0.14)' }
      }
    };
  }
  const tone = { ...base, s: Math.max(52, base.s) };
  return {
    label: 'Свой цвет', primary: color, bright: hsl({ ...tone, l: Math.min(76, Math.max(58, tone.l + 22)) }), soft: hsl({ ...tone, l: Math.max(38, tone.l) }, '0.16'), onPrimary: contrastText(color),
    themes: {
      dark: { bgTop: hsl({ ...tone, l: 20 }), bgMid: hsl({ ...tone, s: Math.max(34, tone.s - 18), l: 10 }), bgBottom: hsl({ ...tone, s: 30, l: 4 }), surface: hsl({ ...tone, s: Math.max(28, tone.s - 22), l: 10 }), surfaceRaised: hsl({ ...tone, s: Math.max(34, tone.s - 16), l: 16 }), border: hsl({ ...tone, l: 72 }, '0.25'), text: '#f8faf8', muted: hsl({ ...tone, s: 18, l: 74 }), shadow: 'rgba(0, 0, 0, 0.3)' },
      light: { bgTop: hsl({ ...tone, s: Math.min(60, tone.s), l: 95 }), bgMid: hsl({ ...tone, s: Math.min(46, tone.s), l: 90 }), bgBottom: hsl({ ...tone, s: Math.min(38, tone.s), l: 86 }), surface: hsl({ ...tone, s: Math.min(28, tone.s), l: 99 }), surfaceRaised: hsl({ ...tone, s: Math.min(38, tone.s), l: 96 }), border: hsl({ ...tone, l: 48 }, '0.24'), text: '#17211d', muted: hsl({ ...tone, s: 18, l: 38 }), shadow: hsl({ ...tone, l: 30 }, '0.14') }
    }
  };
}

export const THEMES = {
  dark: { label: 'Тёмная' },
  light: { label: 'Светлая' }
};

export function normalizeUser(user) {
  const names = Array.from(new Set([...(user?.previousNames || []), ...(user?.legacyNames || []), user?.name].filter(Boolean)));
  return {
    id: user?.id || `user-${Date.now()}`,
    name: user?.name || '',
    avatar: user?.avatar || '🧑',
    previousNames: names,
    // Keep the old property while existing components and saved installations migrate.
    legacyNames: names,
    archived: Boolean(user?.archived),
    createdAt: user?.createdAt || new Date().toISOString()
  };
}

export function getUserTransactionNames(user) {
  return new Set([user?.name, ...(user?.previousNames || []), ...(user?.legacyNames || [])].filter(Boolean));
}

function readRaw() {
  try { return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

export function loadSettings() {
  if (typeof window === 'undefined') return { currency: 'EUR', accent: 'green', theme: 'dark' };
  const raw = readRaw();
  return {
    version: 1,
    currency: ['EUR', 'USD', 'RUB', 'PLN', 'UAH'].includes(raw.currency) ? raw.currency : 'EUR',
    baseCurrency: ['EUR', 'USD', 'RUB', 'PLN', 'UAH'].includes(raw.baseCurrency) ? raw.baseCurrency : 'EUR',
    // "custom" is not an ACCENTS entry: its actual value lives in customAccent.
    // Keep it explicitly, otherwise every reload falls back to green.
    accent: raw.accent === 'custom' || ACCENTS[raw.accent] ? raw.accent : 'green',
    customAccent: /^#[\da-f]{6}$/i.test(raw.customAccent) ? raw.customAccent : '#2fcf72',
    theme: THEMES[raw.theme] ? raw.theme : 'dark',
    deletedNames: raw.deletedNames && typeof raw.deletedNames === 'object' ? raw.deletedNames : {},
    deletedCategoryNames: raw.deletedCategoryNames && typeof raw.deletedCategoryNames === 'object' ? raw.deletedCategoryNames : {}
  };
}

export function persistSettings(settings) {
  const { users, onboardingComplete, ...uiSettings } = settings;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, ...uiSettings }));
}

// One-time bridge for installations from before budget_users existed.
// The copy is removed immediately, so it cannot remain the source of truth.
export function readLegacyUsersForMigration() {
  const raw = readRaw();
  return Array.isArray(raw.users) ? raw.users.filter((user) => user?.name).map(normalizeUser) : [];
}

export function clearLegacyUsersAfterMigration() {
  const raw = readRaw();
  if (Object.hasOwn(raw, 'users')) {
    delete raw.users;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(raw));
  }
}
