export const expenseCategories = [
  { label: 'Продукты', icon: '🛒', color: '#4ADE80' },
  { label: 'Топливо', icon: '⛽', color: '#F59E0B' },
  { label: 'Кафе', icon: '🍔', color: '#FB7185' },
  { label: 'Курение', icon: '🚬', color: '#A78BFA' },
  { label: 'Дом', icon: '🏠', color: '#60A5FA' },
  { label: 'Машина', icon: '🚗', color: '#38BDF8' },
  { label: 'Здоровье', icon: '💊', color: '#F472B6' },
  { label: 'Одежда', icon: '👕', color: '#FACC15' },
  { label: 'Досуг', icon: '🎮', color: '#C084FC' },
  { label: 'Другое', icon: '📦', color: '#94A3B8' }
];

export const incomeCategories = [
  { label: 'Зарплата', icon: '💼' },
  { label: 'Премия', icon: '💰' },
  { label: 'Подарок', icon: '🎁' },
  { label: 'Подработка', icon: '📈' },
  { label: 'Другое', icon: '💵' }
];

export function getCategoryIcon(categoryLabel) {
  const matchedCategory = [...expenseCategories, ...incomeCategories].find((item) => item.label === categoryLabel);
  return matchedCategory?.icon || '📦';
}

export function getCategoryColor(categoryLabel) {
  const matchedCategory = expenseCategories.find((item) => item.label === categoryLabel);
  return matchedCategory?.color || '#94A3B8';
}
