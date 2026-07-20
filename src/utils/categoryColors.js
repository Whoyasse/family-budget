export const CATEGORY_COLOR_PALETTE = [
  '#4ADE80', '#F59E0B', '#60A5FA', '#A78BFA', '#F472B6', '#38BDF8', '#FACC15', '#FB7185', '#2DD4BF', '#FB923C', '#818CF8', '#E879F9'
];

const LEGACY_FALLBACK = '#94A3B8';

function hashName(name) {
  return Array.from(String(name || '')).reduce((hash, character) => ((hash * 31) + character.codePointAt(0)) >>> 0, 0);
}

export function getStableCategoryColor(name) {
  return CATEGORY_COLOR_PALETTE[hashName(name) % CATEGORY_COLOR_PALETTE.length];
}

export function getNextCategoryColor(categories = []) {
  const used = new Set(categories.map((category) => category?.color).filter((color) => color && color !== LEGACY_FALLBACK));
  return CATEGORY_COLOR_PALETTE.find((color) => !used.has(color)) || getStableCategoryColor(`${Date.now()}-${categories.length}`);
}

export function resolveCategoryColor(category) {
  if (category?.color && category.color !== LEGACY_FALLBACK) return category.color;
  return getStableCategoryColor(category?.name || category?.label);
}
