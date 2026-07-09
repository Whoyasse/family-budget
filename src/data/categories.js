export const expenseCategories = [
  { label: 'Продукты', icon: '🛒' },
  { label: 'Топливо', icon: '⛽' },
  { label: 'Кафе', icon: '🍔' },
  { label: 'Курение', icon: '🚬' },
  { label: 'Дом', icon: '🏠' },
  { label: 'Машина', icon: '🚗' },
  { label: 'Здоровье', icon: '💊' },
  { label: 'Одежда', icon: '👕' },
  { label: 'Досуг', icon: '🎮' },
  { label: 'Другое', icon: '📦' }
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
