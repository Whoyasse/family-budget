import { useEffect, useMemo, useRef, useState } from 'react';
import { getCategoryIcon } from './data/categories';
import { lazy, Suspense } from 'react';
import { formatTransactionDate, getMonthKey, getMonthLabel, parseDate, parseTimeValue } from './utils/date';
import { calculateExpenseBreakdown, calculateMonthlyTotals, calculateTotals } from './utils/statistics';
import HomePage from './pages/HomePage';
import TransactionWizard from './components/TransactionWizard';
import OnboardingWizard from './components/OnboardingWizard';
import { ACCENTS, THEMES, createCustomAccent, getUserTransactionNames, loadSettings, persistSettings } from './utils/settingsStorage';
import { exportTransactionsToXlsx } from './utils/exportTransactions';
import { getExchangeRate } from './utils/exchangeRates';
import { getBalancePoints } from './utils/balanceHistory';
import { getCategoryLimit } from './utils/categoryStorage';
import { createTransaction, deleteTransaction, loadTransactions, updateTransaction } from './services/transactionsService';
import { createCategories, deleteCategory, loadCategories as loadSupabaseCategories, loadCategoryLimits, saveCategory, saveCategoryLimit } from './services/categoriesService';
import { loadHouseholdSettings, saveHouseholdSettings } from './services/settingsService';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';
import AuthPage from './pages/AuthPage';
import HouseholdSetupPage from './pages/HouseholdSetupPage';

const PERSON_STORAGE_KEY = 'family-budget-last-person';
const EXPENSE_CATEGORY_STORAGE_KEY = 'family-budget-last-expense-category';
const INCOME_CATEGORY_STORAGE_KEY = 'family-budget-last-income-category';

const navItems = [
  { id: 'home', icon: '🏠', label: 'Главная' },
  { id: 'journal', icon: '📅', label: 'Журнал' },
  { id: 'add', icon: '+', label: '' },
  { id: 'stats', icon: '📊', label: 'Аналитика' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' }
];

const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SettingsCurrencyPage = lazy(() => import('./pages/SettingsCurrencyPage'));
const SettingsFamilyPage = lazy(() => import('./pages/SettingsFamilyPage'));
const SettingsAppearancePage = lazy(() => import('./pages/SettingsAppearancePage'));
const SettingsCategoriesPage = lazy(() => import('./pages/SettingsCategoriesPage'));
const SettingsDataPage = lazy(() => import('./pages/SettingsDataPage'));
const TransactionEditSheet = lazy(() => import('./components/TransactionEditSheet'));
const CategoryLimitSheet = lazy(() => import('./components/CategoryLimitSheet'));
const CategoryManagerSheet = lazy(() => import('./components/CategoryManagerSheet'));
const CategoryAnalyticsPage = lazy(() => import('./pages/CategoryAnalyticsPage'));
const UserAnalyticsPage = lazy(() => import('./pages/UserAnalyticsPage'));
const BalancePage = lazy(() => import('./pages/BalancePage'));

function RouteLoading() {
  return <div className="screen route-loading" aria-live="polite"><div className="card"><div className="loading-spinner" /><p>Загружаем экран…</p></div></div>;
}

function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/\s/g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function readStoredSelection(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  return stored || fallback;
}

function normalizePersonValue(value) {
  if (value === 'Жена') return 'Ида';
  return value;
}

function persistSelection(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function App() {
  const { session, authUser, loading: authLoading, signOut } = useAuth();
  const { householdId, household, budgetUsers: familyUsers, loading: householdLoading, onboardingCompleted, createBudgetUser, updateBudgetUser, deleteBudgetUser, updateHouseholdName, completeOnboarding, restartOnboarding } = useHousehold();
  const [settings, setSettings] = useState(() => loadSettings());
  const [categories, setCategories] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [limitCategory, setLimitCategory] = useState(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(() => settings.baseCurrency === settings.currency ? 1 : null);
  const [startBalance, setStartBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [homeSelectedMonth, setHomeSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [view, setView] = useState('home');
  const [settingsSection, setSettingsSection] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  const [categoryReturnView, setCategoryReturnView] = useState('home');
  const [journalTab, setJournalTab] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilters, setHistoryFilters] = useState({ person: '', type: '', category: '', dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' });
  const [selectedDayTransactions, setSelectedDayTransactions] = useState([]);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const touchStartYRef = useRef(null);
  const [form, setForm] = useState(() => ({
    person: readStoredSelection(PERSON_STORAGE_KEY, familyUsers.find((user) => !user.archived)?.name || ''),
    type: 'Расход',
    category: readStoredSelection(EXPENSE_CATEGORY_STORAGE_KEY, categories.find((category) => category.type === 'expense' && !category.archived)?.name || ''),
    amount: '',
    comment: ''
  }));
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('de-DE', { style: 'currency', currency: settings.currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }), [settings.currency]);
  const formatCurrency = (value) => currencyFormatter.format(Number(value || 0) * (exchangeRate || 1));

  const refreshTransactions = async (options = {}) => {
    const { showStatus = true, statusMessage = 'Обновлено', showLoading = true } = options;
    if (showLoading) {
      setLoading(true);
    }
    if (showStatus) {
      setStatus('');
    }

    try {
      const parsed = await loadTransactions(householdId);
      setTransactions(parsed);
      if (showStatus) {
        setStatus(statusMessage);
      }
      return parsed;
    } catch (error) {
      console.error(error);
      setStatus('Не удалось загрузить данные. Проверьте подключение к интернету и попробуйте ещё раз.');
      return [];
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!authUser || !householdId) return;
    void refreshTransactions();
  }, [authUser, householdId]);

  useEffect(() => {
    if (!authUser || !householdId) return undefined;
    let cancelled = false;
    Promise.all([loadSupabaseCategories(householdId), loadCategoryLimits(householdId), loadHouseholdSettings(householdId)])
      .then(([nextCategories, nextBudgets, nextSettings]) => {
        if (cancelled) return;
        setCategories(nextCategories);
        setCategoryBudgets(nextBudgets);
        if (nextSettings) {
          setStartBalance(Number(nextSettings.starting_balance ?? 0));
          setSettings((current) => ({
            ...current,
            currency: nextSettings.currency || current.currency,
            baseCurrency: nextSettings.base_currency || current.baseCurrency
          }));
        }
      })
      .catch((error) => { console.error(error); if (!cancelled) setStatus('Не удалось загрузить данные. Проверьте подключение к интернету и попробуйте ещё раз.'); });
    return () => { cancelled = true; };
  }, [authUser, householdId]);

  useEffect(() => {
    persistSettings(settings);
    const accent = settings.accent === 'custom' ? createCustomAccent(settings.customAccent) : ACCENTS[settings.accent] || ACCENTS.green;
    const theme = accent.themes[settings.theme] || accent.themes.dark;
    document.documentElement.style.setProperty('--accent-primary', accent.primary);
    document.documentElement.style.setProperty('--accent-bright', accent.bright);
    document.documentElement.style.setProperty('--accent-soft', accent.soft);
    document.documentElement.style.setProperty('--accent-contrast', accent.onPrimary || '#ffffff');
    document.documentElement.style.setProperty('--theme-bg-top', theme.bgTop);
    document.documentElement.style.setProperty('--theme-bg-mid', theme.bgMid);
    document.documentElement.style.setProperty('--theme-bg-bottom', theme.bgBottom);
    document.documentElement.style.setProperty('--theme-surface', theme.surface);
    document.documentElement.style.setProperty('--theme-surface-raised', theme.surfaceRaised);
    document.documentElement.style.setProperty('--theme-border', theme.border);
    document.documentElement.style.setProperty('--theme-muted', theme.muted);
    document.documentElement.style.setProperty('--theme-text', theme.text);
    document.documentElement.style.setProperty('--theme-shadow', theme.shadow);
  }, [settings]);


  useEffect(() => {
    let cancelled = false;
    if (settings.baseCurrency === settings.currency) {
      setExchangeRate(1);
      return undefined;
    }
    setExchangeRate(null);
    getExchangeRate(settings.baseCurrency, settings.currency)
      .then((rate) => { if (!cancelled) setExchangeRate(rate); })
      .catch((error) => { console.error(error); if (!cancelled) setStatus('Курс валют временно недоступен'); });
    return () => { cancelled = true; };
  }, [settings.baseCurrency, settings.currency]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.familyBudgetSettingsSection) {
        setView('settings');
        setSettingsSection(event.state.familyBudgetSettingsSection);
      } else if (view === 'settings') {
        setSettingsSection(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

  useEffect(() => {
    if (!status) return undefined;

    const timer = window.setTimeout(() => {
      setStatus('');
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!isAddSheetOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAddSheetOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddSheetOpen]);

  useEffect(() => {
    const isOverlayOpen = isAddSheetOpen || isEditSheetOpen || isTransactionDetailOpen || isDaySheetOpen || isDeleteConfirmOpen || Boolean(limitCategory) || isCategoryManagerOpen;
    if (!isOverlayOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsAddSheetOpen(false);
      setIsEditSheetOpen(false);
      setIsTransactionDetailOpen(false);
      setIsDaySheetOpen(false);
      setIsDeleteConfirmOpen(false);
      setLimitCategory(null);
      setIsCategoryManagerOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isAddSheetOpen, isEditSheetOpen, isTransactionDetailOpen, isDaySheetOpen, isDeleteConfirmOpen, limitCategory, isCategoryManagerOpen]);

  const availableMonths = useMemo(() => {
    const months = new Set([homeSelectedMonth]);
    transactions.forEach((transaction) => {
      if (transaction.date) {
        months.add(getMonthKey(transaction.date));
      }
    });

    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    return Array.from(months).sort((a, b) => a.localeCompare(b));
  }, [homeSelectedMonth, transactions]);

  useEffect(() => {
    if (!availableMonths.includes(homeSelectedMonth)) {
      setHomeSelectedMonth(availableMonths[availableMonths.length - 1] || homeSelectedMonth);
    }
  }, [availableMonths, homeSelectedMonth]);

  const homeFilteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => getMonthKey(transaction.date) === homeSelectedMonth);
  }, [transactions, homeSelectedMonth]);
  const journalFilteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => getMonthKey(transaction.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  const totals = useMemo(() => calculateTotals(homeFilteredTransactions), [homeFilteredTransactions]);
  const totalIncome = totals.income;
  const totalExpense = totals.expense;

  const currentBalance = useMemo(() => {
    return (startBalance ?? 0) + transactions.filter((t) => t.type === 'Доход').reduce((sum, t) => sum + t.amount, 0) - transactions.filter((t) => t.type === 'Расход').reduce((sum, t) => sum + t.amount, 0);
  }, [startBalance, transactions]);
  const balancePoints = useMemo(() => getBalancePoints(transactions, startBalance), [transactions, startBalance]);

  const expenseBreakdown = useMemo(() => calculateExpenseBreakdown(homeFilteredTransactions), [homeFilteredTransactions]);
  const homeCategoryBudgets = useMemo(() => {
    const monthlySpent = new Map(expenseBreakdown.map((item) => [item.category, item.sum]));
    return categories.filter((category) => category.type === 'expense' && !category.archived).map((category) => {
      const spent = [...monthlySpent.entries()].filter(([name]) => category.previousNames.includes(name)).reduce((sum, [, amount]) => sum + amount, 0);
      const limit = getCategoryLimit(categoryBudgets, category.id, homeSelectedMonth);
      return { ...category, spent, limit, percent: limit ? spent / limit * 100 : 0 };
    }).filter((category) => category.limit || category.spent > 0);
  }, [categories, categoryBudgets, expenseBreakdown, homeSelectedMonth]);
  const monthlyTotals = useMemo(() => calculateMonthlyTotals(transactions), [transactions]);

  useEffect(() => {
    setIsDaySheetOpen(false);
    setSelectedDayKey(null);
    setSelectedDayTransactions([]);
  }, [selectedMonth]);

  const calendarDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const firstWeekDay = (firstDayOfMonth.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstWeekDay + lastDayOfMonth.getDate()) / 7) * 7;
    const transactionsByDay = journalFilteredTransactions.reduce((acc, transaction) => {
      const parsedDate = parseDate(transaction.date);
      if (!parsedDate) return acc;
      const dayKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(transaction);
      return acc;
    }, {});

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayOffset = index - firstWeekDay + 1;
      const currentDate = new Date(year, month - 1, dayOffset);
      const dayKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const dayTransactions = transactionsByDay[dayKey] || [];

      return {
        dayKey,
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month - 1,
        isToday: dayKey === todayKey,
        transactions: dayTransactions,
        transactionCount: dayTransactions.length,
        totalExpense: dayTransactions
          .filter((transaction) => transaction.type === 'Расход')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        totalIncome: dayTransactions
          .filter((transaction) => transaction.type === 'Доход')
          .reduce((sum, transaction) => sum + transaction.amount, 0)
      };
    });
  }, [journalFilteredTransactions, selectedMonth]);

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayKey) return '';
    const [year, month, day] = selectedDayKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDayKey]);

  const selectedDayTotals = useMemo(() => {
    return selectedDayTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'Доход') {
          acc.income += transaction.amount;
        }
        if (transaction.type === 'Расход') {
          acc.expense += transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [selectedDayTransactions]);

  const filteredHistoryTransactions = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    const parseSearchAmount = (value) => {
      const normalized = String(value).trim().replace(',', '.');
      return normalized === '' ? null : Number(normalized);
    };
    const amountFrom = parseSearchAmount(historyFilters.amountFrom);
    const amountTo = parseSearchAmount(historyFilters.amountTo);
    const dateFrom = parseDate(historyFilters.dateFrom)?.getTime() ?? null;
    const dateTo = parseDate(historyFilters.dateTo)?.getTime() ?? null;

    return transactions.filter((transaction) => {
      const parsedDate = parseDate(transaction.date);
      const dateTokens = parsedDate
        ? [
            transaction.date,
            parsedDate.toLocaleDateString('ru-RU'),
            parsedDate.toLocaleDateString('ru-RU', { month: 'long' }),
            parsedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
            parsedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
            `${String(parsedDate.getDate()).padStart(2, '0')}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${parsedDate.getFullYear()}`,
            `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
          ]
        : [transaction.date];
      const haystack = `${dateTokens.join(' ')} ${transaction.category || ''} ${transaction.comment || ''}`.toLowerCase();
      const matchesText = !search || haystack.includes(search);
      const matchesFrom = !Number.isFinite(amountFrom) || transaction.amount >= amountFrom;
      const matchesTo = !Number.isFinite(amountTo) || transaction.amount <= amountTo;
      const transactionDate = parsedDate?.getTime() ?? null;
      const matchesDateFrom = dateFrom === null || (transactionDate !== null && transactionDate >= dateFrom);
      const matchesDateTo = dateTo === null || (transactionDate !== null && transactionDate <= dateTo);
      const selectedUser = familyUsers.find((user) => user.id === historyFilters.person);
      const matchesPerson = !historyFilters.person || (selectedUser ? getUserTransactionNames(selectedUser).has(transaction.person) : transaction.person === historyFilters.person);
      const matchesType = !historyFilters.type || transaction.type === historyFilters.type;
      const matchesCategory = !historyFilters.category || transaction.category === historyFilters.category;
      return matchesText && matchesFrom && matchesTo && matchesDateFrom && matchesDateTo && matchesPerson && matchesType && matchesCategory;
    });
  }, [historyFilters, historySearch, familyUsers, transactions]);

  const historyFilterOptions = useMemo(() => ({
    people: familyUsers.map((user) => ({ id: user.id, name: user.name, avatar: user.avatar, archived: user.archived })),
    categories: [...new Set(transactions.map((transaction) => transaction.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'))
  }), [familyUsers, transactions]);

  const handleBalanceSave = async (event) => {
    event.preventDefault();
    const value = Number(event.target.balance.value);
    if (!Number.isFinite(value)) return;
    try {
      await saveHouseholdSettings(householdId, { starting_balance: value });
      setStartBalance(value);
      setView('home');
      setStatus('Начальный баланс сохранён');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось сохранить баланс. Попробуйте ещё раз.');
    }
  };

  const handleSettingsChange = async (nextSettings) => {
    setSettings(nextSettings);
    try {
      await saveHouseholdSettings(householdId, {
        currency: nextSettings.currency,
        base_currency: nextSettings.baseCurrency
      });
    } catch (error) {
      console.error(error);
      setStatus('Не удалось сохранить настройки. Попробуйте ещё раз.');
    }
  };

  const handleCategoriesChange = async (nextCategories) => {
    setCategories(nextCategories);
  };

  const handleSaveCategory = async (category) => {
    try {
      const saved = await saveCategory(householdId, { ...category, position: categories.findIndex((item) => item.id === category.id) });
      setCategories((current) => current.map((item) => item.id === category.id ? saved : item));
      setStatus('Категория сохранена');
      return saved;
    } catch (error) {
      console.error(error);
      setStatus('Не удалось сохранить категорию. Попробуйте ещё раз.');
      void loadSupabaseCategories(householdId).then(setCategories);
      throw error;
    }
  };

  const handleCategoryLimitChange = async (categoryId, monthKey, value) => {
    try {
      await saveCategoryLimit(householdId, categoryId, monthKey, value);
      setCategoryBudgets(await loadCategoryLimits(householdId));
      setStatus(value ? 'Лимит сохранён' : 'Лимит убран');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось изменить лимит. Попробуйте ещё раз.');
      throw error;
    }
  };

  const handleHomeMonthChange = (month) => {
    setHomeSelectedMonth(month);
    setSelectedMonth(month);
  };

  const handleOpenAddSheet = () => {
    setEditingTransaction(null);
    setForm({
      person: readStoredSelection(PERSON_STORAGE_KEY, familyUsers.find((user) => !user.archived)?.name || ''),
      type: 'Расход',
      category: readStoredSelection(EXPENSE_CATEGORY_STORAGE_KEY, categories.find((category) => category.type === 'expense' && !category.archived)?.name || ''),
      amount: '',
      comment: ''
    });
    setIsAddSheetOpen(true);
  };

  const handleOpenEditSheet = (transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setForm({
        person: normalizePersonValue(transaction.person || familyUsers.find((user) => !user.archived)?.name || ''),
        type: transaction.type || 'Расход',
        category: transaction.category || categories.find((category) => category.type === 'expense' && !category.archived)?.name || '',
        amount: String(((transaction.amount || 0) * (exchangeRate || 1))),
        comment: transaction.comment || ''
      });
    }
    setIsEditSheetOpen(true);
  };

  const handleCloseAddSheet = () => {
    setIsAddSheetOpen(false);
    setEditingTransaction(null);
  };

  const handleCloseEditSheet = () => {
    setIsEditSheetOpen(false);
    setEditingTransaction(null);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'person') {
      persistSelection(PERSON_STORAGE_KEY, value);
      setForm((prev) => ({ ...prev, person: value }));
      return;
    }

    if (name === 'type') {
      const categoryType = value === 'Расход' ? 'expense' : 'income';
      const fallback = categories.find((category) => category.type === categoryType && !category.archived)?.name || '';
      const nextCategory = value === 'Расход'
        ? readStoredSelection(EXPENSE_CATEGORY_STORAGE_KEY, fallback)
        : readStoredSelection(INCOME_CATEGORY_STORAGE_KEY, fallback);
      setForm((prev) => ({ ...prev, type: value, category: nextCategory }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (categoryLabel) => {
    setForm((prev) => ({ ...prev, category: categoryLabel }));
    persistSelection(form.type === 'Расход' ? EXPENSE_CATEGORY_STORAGE_KEY : INCOME_CATEGORY_STORAGE_KEY, categoryLabel);
  };

  const handleSelectDay = (day) => {
    setSelectedDayKey(day.dayKey);
    setSelectedDayTransactions(day.transactions);
    setIsDaySheetOpen(true);
  };

  const handleOpenTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionDetailOpen(true);
  };

  const handleOpenCategory = (category, returnView) => {
    setSelectedCategory(category);
    setCategoryReturnView(returnView);
    setView('category');
  };

  const handleCloseCategory = () => {
    setSelectedCategory(null);
    setView(categoryReturnView);
  };

  const handleCloseTransactionDetails = () => {
    setSelectedTransaction(null);
    setIsTransactionDetailOpen(false);
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteTransactionRequest = () => {
    if (!selectedTransaction) return;
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      await deleteTransaction(householdId, selectedTransaction.id);
      setTransactions((current) => current.filter((transaction) => transaction.id !== selectedTransaction.id));
      setIsTransactionDetailOpen(false);
      setIsDeleteConfirmOpen(false);
      setSelectedTransaction(null);
      setStatus('✓ Операция удалена');
      setLoading(false);
    } catch (error) {
      console.error(error);
      setStatus('Не удалось удалить операцию. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const enteredAmount = parseAmount(form.amount);
    if (!enteredAmount || enteredAmount <= 0) {
      setStatus('Введите сумму больше нуля.');
      return;
    }
    if (!exchangeRate) {
      setStatus('Дождитесь загрузки курса валют');
      return;
    }
    const amount = enteredAmount / exchangeRate;
    const isEditing = Boolean(editingTransaction);
    const user = familyUsers.find((item) => item.name === form.person);
    const category = categories.find((item) => item.name === form.category);
    if (!user || !category) { setStatus('Выберите существующего участника и категорию'); return; }
    const storedDate = isEditing ? parseDate(editingTransaction.date) : null;
    const storedTime = isEditing ? parseTimeValue(editingTransaction.time) : null;
    if (storedDate && storedTime) storedDate.setHours(storedTime.getHours(), storedTime.getMinutes(), 0, 0);
    const payload = { userId: user.id, categoryId: category.id, createdBy: authUser.id, type: form.type, amount, comment: form.comment ?? '', occurredAt: storedDate?.toISOString() || new Date().toISOString() };

    setIsSubmitting(true);
    try {
      const saved = isEditing ? await updateTransaction(householdId, editingTransaction.id, payload) : await createTransaction(householdId, payload);
      setTransactions((current) => isEditing ? current.map((transaction) => transaction.id === saved.id ? saved : transaction) : [saved, ...current]);

      setIsAddSheetOpen(false);
      setIsEditSheetOpen(false);
      setIsTransactionDetailOpen(false);
      setEditingTransaction(null);
      setSelectedTransaction(null);
      setForm((prev) => ({ ...prev, amount: '', comment: '' }));
      setView('home');
      setStatus(isEditing ? '✓ Операция изменена' : '✓ Операция сохранена');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось сохранить операцию. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWelcome = () => <OnboardingWizard onComplete={async ({ baseCurrency, currency, balance, users, categories: onboardingCategories }) => {
    try {
      const usersToCreate = users.filter((user) => !familyUsers.some((existing) => existing.name === user.name));
      await Promise.all(usersToCreate.map((user) => createBudgetUser(user)));
      const createdCategories = categories.length ? categories : await createCategories(householdId, onboardingCategories);
      await saveHouseholdSettings(householdId, {
        currency,
        base_currency: baseCurrency,
        starting_balance: balance
      });
      setStartBalance(balance);
      setCategories(createdCategories);
      setSettings({ ...settings, baseCurrency, currency });
      await completeOnboarding();
      setForm((current) => ({ ...current, person: users.find((user) => !user.archived)?.name || current.person }));
    } catch (error) {
      console.error(error);
      const message = 'Не удалось сохранить настройку семьи. Проверьте подключение и попробуйте ещё раз.';
      setStatus(message);
      throw new Error(message);
    }
  }} />;

  const renderHome = () => (
    <HomePage
      currentBalance={currentBalance}
      selectedMonth={homeSelectedMonth}
      availableMonths={availableMonths}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      monthlyBalanceChange={totalIncome - totalExpense}
      balancePoints={balancePoints}
      expenseBreakdown={expenseBreakdown}
      categoryBudgets={homeCategoryBudgets}
      filteredTransactions={homeFilteredTransactions}
      formatCurrency={formatCurrency}
      formatTransactionDate={formatTransactionDate}
      getMonthLabel={getMonthLabel}
      onMonthChange={handleHomeMonthChange}
      onOpenTransactionDetails={handleOpenTransactionDetails}
      onOpenCategory={(category) => handleOpenCategory(category, 'home')}
      onOpenLimit={setLimitCategory}
      onOpenBalance={() => setView('balance')}
      loading={loading}
      onAddTransaction={handleOpenAddSheet}
    />
  );

  const renderCalendar = () => (
    <CalendarPage
      selectedMonth={selectedMonth}
      onPrevMonth={() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const previousMonth = new Date(year, month - 2, 1);
        setSelectedMonth(`${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`);
      }}
      onCurrentMonth={() => {
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      }}
      onNextMonth={() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const nextMonth = new Date(year, month, 1);
        setSelectedMonth(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
      }}
      calendarDays={calendarDays}
      onSelectDay={handleSelectDay}
      formatCurrency={formatCurrency}
      getMonthLabel={getMonthLabel}
    />
  );

  const renderHistory = () => (
    <HistoryPage
      transactions={filteredHistoryTransactions}
      searchValue={historySearch}
      onSearchChange={setHistorySearch}
      filters={historyFilters}
      filterOptions={historyFilterOptions}
      onFiltersChange={setHistoryFilters}
      onSelectTransaction={handleOpenTransactionDetails}
      formatCurrency={formatCurrency}
      formatTransactionDate={formatTransactionDate}
    />
  );

  const renderJournal = () => (
    <div className="screen journal-screen">
      <div className="card journal-tabs">
        <button
          type="button"
          className={`journal-tab ${journalTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setJournalTab('calendar')}
        >
          Календарь
        </button>
        <button
          type="button"
          className={`journal-tab ${journalTab === 'history' ? 'active' : ''}`}
          onClick={() => setJournalTab('history')}
        >
          История
        </button>
      </div>
      {journalTab === 'calendar' ? renderCalendar() : renderHistory()}
    </div>
  );

  const renderAddSheet = () => {
    if (!isAddSheetOpen) return null;

    return (
      <TransactionWizard
        form={form}
        isEditing={Boolean(editingTransaction)}
        isSubmitting={isSubmitting}
        loading={loading}
        currencyLabel={settings.currency}
        isRateLoading={!exchangeRate}
        users={editingTransaction ? familyUsers : familyUsers.filter((user) => !user.archived)}
        categoryOptions={categories.filter((category) => !category.archived && category.type === (form.type === 'Расход' ? 'expense' : 'income'))}
        onChange={handleFormChange}
        onCategorySelect={handleCategorySelect}
        onClose={handleCloseAddSheet}
        onSubmit={handleSubmit}
        onReceiptClick={() => setStatus('Добавление чеков появится позже')}
      />
    );
  };

  const renderEditSheet = () => {
    if (!isEditSheetOpen || !editingTransaction) return null;
    return (
      <TransactionEditSheet
        form={form}
        transaction={editingTransaction}
        users={familyUsers}
        categories={categories}
        currencyLabel={settings.currency}
        isSubmitting={isSubmitting}
        isRateLoading={!exchangeRate}
        onChange={handleFormChange}
        onCategorySelect={handleCategorySelect}
        onClose={handleCloseEditSheet}
        onSubmit={handleSubmit}
      />
    );
  };

  const renderCalendarDaySheet = () => {
    if (!isDaySheetOpen) return null;

    return (
      <div className="sheet-backdrop" onClick={() => setIsDaySheetOpen(false)}>
        <div
          className="sheet-card"
          onClick={(event) => event.stopPropagation()}
          onTouchStart={(event) => {
            touchStartYRef.current = event.touches[0].clientY;
          }}
          onTouchEnd={(event) => {
            if (touchStartYRef.current === null) return;
            const deltaY = event.changedTouches[0].clientY - touchStartYRef.current;
            if (deltaY > 90) {
              setIsDaySheetOpen(false);
            }
            touchStartYRef.current = null;
          }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div>
              <p className="eyebrow">Операции</p>
              <h3>{selectedDayLabel}</h3>
            </div>
            <button className="ghost-btn" onClick={() => setIsDaySheetOpen(false)}>
              Закрыть
            </button>
          </div>

          <div className="card sheet-panel stack">
            <div className="summary-grid">
              <div className="card summary-card income">
                <p>Доход</p>
                <strong>{formatCurrency(selectedDayTotals.income)}</strong>
              </div>
              <div className="card summary-card expense">
                <p>Расход</p>
                <strong>{formatCurrency(selectedDayTotals.expense)}</strong>
              </div>
            </div>

            {selectedDayTransactions.length === 0 ? (
              <p className="muted">Операций нет</p>
            ) : (
              <div className="transaction-list">
                {selectedDayTransactions.map((transaction) => (
                  <button
                    key={`${transaction.id}-${transaction.date}-${transaction.time}`}
                    type="button"
                    className="transaction-item transaction-item--interactive"
                    onClick={() => handleOpenTransactionDetails(transaction)}
                  >
                    <div className="transaction-icon">
                      {transaction.type === 'Доход' ? '↗' : '↘'}
                    </div>
                    <div className="transaction-info">
                      <strong>{transaction.category}</strong>
                      <p>{transaction.person ? `• ${transaction.person}` : ''}</p>
                      {transaction.comment ? <p className="transaction-comment">{transaction.comment}</p> : null}
                    </div>
                    <div className="transaction-meta">
                      <span className={`amount ${transaction.type === 'Доход' ? 'positive' : 'negative'}`}>
                        {transaction.type === 'Доход' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                      <p>{transaction.time ? parseTimeValue(transaction.time)?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionDetailSheet = () => {
    if (!isTransactionDetailOpen || !selectedTransaction) return null;

    return (
      <div className="sheet-backdrop" onClick={handleCloseTransactionDetails}>
        <div
          className="sheet-card"
          onClick={(event) => event.stopPropagation()}
          onTouchStart={(event) => {
            touchStartYRef.current = event.touches[0].clientY;
          }}
          onTouchEnd={(event) => {
            if (touchStartYRef.current === null) return;
            const deltaY = event.changedTouches[0].clientY - touchStartYRef.current;
            if (deltaY > 90) {
              handleCloseTransactionDetails();
            }
            touchStartYRef.current = null;
          }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div>
              <p className="eyebrow">Операция</p>
              <h3>{selectedTransaction.category}</h3>
            </div>
            <button className="ghost-btn" onClick={handleCloseTransactionDetails}>
              Закрыть
            </button>
          </div>

          <div className="card sheet-panel stack detail-sheet-body">
            <div className="detail-hero">
              <div className="detail-hero__icon">{getCategoryIcon(selectedTransaction.category)}</div>
              <div>
                <p className="eyebrow">{selectedTransaction.type}</p>
                <h3>{selectedTransaction.category || 'Операция'}</h3>
              </div>
            </div>
            <div className="summary-grid">
              <div className={`card summary-card ${selectedTransaction.type === 'Доход' ? 'income' : 'expense'}`}>
                <p>Сумма</p>
                <strong>{formatCurrency(selectedTransaction.amount)}</strong>
              </div>
              <div className="card summary-card">
                <p>Человек</p>
                <strong>{selectedTransaction.person || '—'}</strong>
              </div>
            </div>
            <div className="detail-list">
              <div className="detail-row"><span>Категория</span><strong>{selectedTransaction.category || '—'}</strong></div>
              <div className="detail-row"><span>Сумма</span><strong>{formatCurrency(selectedTransaction.amount)}</strong></div>
              <div className="detail-row"><span>Лицо</span><strong>{selectedTransaction.person || '—'}</strong></div>
              <div className="detail-row"><span>Дата/время</span><strong>{formatTransactionDate(selectedTransaction.date, selectedTransaction.time)}</strong></div>
              {selectedTransaction.comment ? (
                <div className="detail-row"><span>Комментарий</span><strong>{selectedTransaction.comment}</strong></div>
              ) : null}
            </div>
            <div className="detail-placeholder">📷 Чек пока не добавлен</div>
            <div className="sheet-actions detail-actions">
              <button className="ghost-btn" type="button" onClick={() => {
                handleCloseTransactionDetails();
                handleOpenEditSheet(selectedTransaction);
              }}>
                ✏️ Изменить
              </button>
              <button className="primary-btn" type="button" onClick={handleDeleteTransactionRequest} disabled={loading}>
                🗑️ Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <AnalyticsPage
      monthlyTotals={monthlyTotals}
      expenseBreakdown={expenseBreakdown}
      totalExpense={totalExpense}
      selectedMonth={homeSelectedMonth}
      filteredTransactions={homeFilteredTransactions}
      allTransactions={transactions}
      formatCurrency={formatCurrency}
      formatTransactionDate={formatTransactionDate}
      getMonthLabel={getMonthLabel}
      getCategoryIcon={getCategoryIcon}
      onBack={() => setView('home')}
      onOpenCategory={(category) => handleOpenCategory(category, 'stats')}
      onOpenTransaction={handleOpenTransactionDetails}
      users={familyUsers}
      categories={categories}
      activeTab={analyticsTab}
      onTabChange={setAnalyticsTab}
      onOpenUser={(user) => { setSelectedUser(user); setView('user'); }}
    />
  );

  const renderCategoryDetail = () => {
    if (!selectedCategory) return null;
    return <CategoryAnalyticsPage category={selectedCategory} selectedMonth={homeSelectedMonth} transactions={transactions} formatCurrency={formatCurrency} formatTransactionDate={formatTransactionDate} getMonthLabel={getMonthLabel} getCategoryIcon={getCategoryIcon} onBack={handleCloseCategory} onOpenTransaction={handleOpenTransactionDetails} />;
  };

  const renderUserAnalytics = () => selectedUser ? <UserAnalyticsPage user={selectedUser} selectedMonth={homeSelectedMonth} allTransactions={transactions} formatCurrency={formatCurrency} formatTransactionDate={formatTransactionDate} getMonthLabel={getMonthLabel} onBack={() => { setSelectedUser(null); setView('stats'); }} onOpenTransaction={handleOpenTransactionDetails} /> : null;
  const renderBalance = () => <BalancePage points={balancePoints} formatCurrency={formatCurrency} onBack={() => setView('home')} />;

  const openSettingsSection = (section) => {
    window.history.pushState({ familyBudgetSettingsSection: section }, '');
    setSettingsSection(section);
  };
  const closeSettingsSection = () => {
    setSettingsSection(null);
    if (window.history.state?.familyBudgetSettingsSection) window.history.back();
  };
  const settingsSharedProps = {
    startBalance,
    exchangeRate,
    onSaveBalance: async (value) => {
      try {
        await saveHouseholdSettings(householdId, { starting_balance: value });
        setStartBalance(value);
        setStatus('Начальный баланс сохранён');
      } catch (error) {
        console.error(error);
        setStatus('Не удалось сохранить баланс');
      }
    },
    settings,
    onSettingsChange: handleSettingsChange,
    transactions,
    users: familyUsers,
    household,
    onUpdateHouseholdName: updateHouseholdName,
    onCreateUser: createBudgetUser,
    onUpdateUser: updateBudgetUser,
    onDeleteUser: async (user) => {
      if (familyUsers.length <= 1) {
        setStatus('Нужен хотя бы один пользователь');
        return;
      }
      try {
        await deleteBudgetUser(user.id);
        setStatus(`Пользователь ${user.name} удалён`);
      } catch (error) {
        console.error(error);
        setStatus('Не удалось удалить пользователя с операциями');
      }
    },
    onStatus: setStatus,
    onExport: async () => { try { await exportTransactionsToXlsx(transactions, monthlyTotals); setStatus('Экспорт готов'); } catch (error) { console.error(error); setStatus('Не удалось экспортировать'); } },
    onRestartOnboarding: () => { void restartOnboarding().catch((error) => { console.error(error); setStatus('Не удалось перезапустить настройку'); }); },
    onManageCategories: () => setIsCategoryManagerOpen(true),
    onSignOut: async () => {
      const { error } = await signOut();
      if (error) {
        console.error(error);
        setStatus('Не удалось выйти из аккаунта');
      }
    }
  };
  const renderSettings = () => {
    if (settingsSection === 'currency') return <SettingsCurrencyPage {...settingsSharedProps} onBack={closeSettingsSection} />;
    if (settingsSection === 'family') return <SettingsFamilyPage {...settingsSharedProps} onBack={closeSettingsSection} />;
    if (settingsSection === 'appearance') return <SettingsAppearancePage {...settingsSharedProps} onBack={closeSettingsSection} />;
    if (settingsSection === 'categories') return <SettingsCategoriesPage {...settingsSharedProps} categories={categories} onBack={closeSettingsSection} />;
    if (settingsSection === 'data') return <SettingsDataPage {...settingsSharedProps} onBack={closeSettingsSection} />;
    return <SettingsPage onOpenSection={openSettingsSection} onSignOut={settingsSharedProps.onSignOut} />;
  };

  const renderCategoryLimitSheet = () => {
    if (!limitCategory) return null;
    const current = homeCategoryBudgets.find((category) => category.id === limitCategory.id) || limitCategory;
    return <CategoryLimitSheet category={current} monthLabel={getMonthLabel(homeSelectedMonth)} spent={current.spent || 0} limit={current.limit} percent={current.percent || 0} formatCurrency={formatCurrency} onClose={() => setLimitCategory(null)} onSave={async (value) => { await handleCategoryLimitChange(current.id, homeSelectedMonth, value); setLimitCategory(null); }} onRemove={async () => { await handleCategoryLimitChange(current.id, homeSelectedMonth, ''); setLimitCategory(null); }} />;
  };

  const renderBottomNavigation = () => (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        if (item.id === 'add') {
          return (
            <button key={item.id} className="bottom-nav__add" onClick={() => handleOpenAddSheet()} type="button">
              {item.icon}
            </button>
          );
        }

        return (
          <button
            key={item.id}
            className={`bottom-nav__item ${view === item.id ? 'active' : ''}`}
            onClick={() => {
              if (item.id === 'journal') {
                setView('journal');
                setJournalTab('calendar');
              } else {
                setView(item.id);
                if (item.id === 'settings') setSettingsSection(null);
              }
            }}
            type="button"
          >
            <span className="bottom-nav__icon">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  if (authLoading) {
    return <main className="auth-loading-shell"><div className="card auth-loading-card"><div className="loading-spinner" /><p>Проверяем вход…</p></div></main>;
  }

  if (!session) {
    return <AuthPage />;
  }

  if (householdLoading) {
    return <main className="auth-loading-shell"><div className="card auth-loading-card"><div className="loading-spinner" /><p>Открываем семейный бюджет…</p></div></main>;
  }

  if (!householdId) {
    return <HouseholdSetupPage />;
  }

  if (onboardingCompleted === null) {
    return <main className="auth-loading-shell"><div className="card auth-loading-card"><div className="loading-spinner" /><p>Проверяем настройку семьи…</p></div></main>;
  }

  if (onboardingCompleted === false) {
    return renderWelcome();
  }

  return (
    <div className="app-shell">
      {status && <div className="toast">{status}</div>}
      <Suspense fallback={<RouteLoading />}>
        {view === 'home' && renderHome()}
        {view === 'stats' && renderStats()}
        {view === 'category' && renderCategoryDetail()}
        {view === 'user' && renderUserAnalytics()}
        {view === 'balance' && renderBalance()}
        {view === 'journal' && renderJournal()}
        {view === 'settings' && renderSettings()}
        {renderAddSheet()}
        {renderEditSheet()}
        {renderCategoryLimitSheet()}
        {isCategoryManagerOpen ? <CategoryManagerSheet categories={categories} budgets={categoryBudgets} selectedMonth={homeSelectedMonth} onChange={handleCategoriesChange} onSaveCategory={handleSaveCategory} onClose={() => setIsCategoryManagerOpen(false)} onStatus={setStatus} onUpdateLimit={(categoryId, value) => handleCategoryLimitChange(categoryId, homeSelectedMonth, value)} onDeleteCategory={async (category) => { try { if (/^[0-9a-f-]{36}$/i.test(category.id)) await deleteCategory(householdId, category.id); setCategories((current) => current.filter((item) => item.id !== category.id)); setStatus(`✓ Категория ${category.name} удалена`); } catch (error) { console.error(error); setStatus('Не удалось удалить категорию. Попробуйте ещё раз.'); throw error; } }} /> : null}
      </Suspense>
      {renderCalendarDaySheet()}
      {renderTransactionDetailSheet()}
      {isDeleteConfirmOpen && selectedTransaction ? (
        <div className="sheet-backdrop" onClick={() => setIsDeleteConfirmOpen(false)}>
          <div className="sheet-card confirmation-card" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="card sheet-panel stack">
              <p className="eyebrow">Подтверждение</p>
              <h3>Удалить операцию?</h3>
              <p className="muted">Это действие нельзя будет отменить.</p>
              <div className="sheet-actions detail-actions">
                <button className="ghost-btn" type="button" onClick={() => setIsDeleteConfirmOpen(false)}>Отмена</button>
                <button className="primary-btn" type="button" onClick={handleDeleteTransaction} disabled={loading}>Удалить</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {loading && <div className="loading">Загрузка…</div>}
      {renderBottomNavigation()}
    </div>
  );
}

export default App;
