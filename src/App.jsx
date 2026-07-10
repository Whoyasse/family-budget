import { useEffect, useMemo, useRef, useState } from 'react';
import { expenseCategories, incomeCategories, getCategoryIcon } from './data/categories';
import { formatTransactionDate, getMonthKey, getMonthLabel, parseDate, parseTimeValue } from './utils/date';
import { calculateExpenseBreakdown, calculateMonthlyTotals, calculateTotals } from './utils/statistics';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

const API_URL = 'https://script.google.com/macros/s/AKfycbwrEtsTaCzgaF0OGDEApNa1WJd-Yof0PUXYhiOodLS9_Tx0Rx9vYQHXrd0CKMyQ7AeO/exec';
const STORAGE_KEY = 'startBalance';
const PERSON_STORAGE_KEY = 'family-budget-last-person';
const EXPENSE_CATEGORY_STORAGE_KEY = 'family-budget-last-expense-category';
const INCOME_CATEGORY_STORAGE_KEY = 'family-budget-last-income-category';

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});
const BACKEND_MUTATIONS_AVAILABLE = true;

const navItems = [
  { id: 'home', icon: '🏠', label: 'Главная' },
  { id: 'calendar', icon: '📅', label: 'Календарь' },
  { id: 'history', icon: '🕘', label: 'История' },
  { id: 'add', icon: '+', label: '' },
  { id: 'stats', icon: '📊', label: 'Аналитика' },
  { id: 'settings', icon: '⚙️', label: 'Настройки' }
];

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/\s/g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zа-яё0-9]/g, '');
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

function pickValue(item, keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '') {
      return item[key];
    }
  }

  const normalizedItem = Object.entries(item || {}).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    if (normalizedItem[normalizedKey] !== undefined && normalizedItem[normalizedKey] !== null && normalizedItem[normalizedKey] !== '') {
      return normalizedItem[normalizedKey];
    }
  }

  return '';
}

function normalizeTransactions(payload) {
  const candidate = payload?.data || payload?.rows || payload?.records || payload?.values || payload;
  if (!candidate) return [];

  const rawRows = Array.isArray(candidate)
    ? candidate
    : Array.isArray(candidate.data)
      ? candidate.data
      : Array.isArray(candidate.rows)
        ? candidate.rows
        : Array.isArray(candidate.records)
          ? candidate.records
          : [];

  if (!Array.isArray(rawRows)) return [];

  const headerAliases = {
    id: ['id', 'ид', 'identifier'],
    date: ['date', 'дата', 'datevalue'],
    time: ['time', 'время', 'timevalue'],
    person: ['person', 'кто', 'personname'],
    type: ['type', 'тип', 'transactiontype'],
    category: ['category', 'категория', 'categoryname'],
    amount: ['amount', 'сумма', 'value', 'sum'],
    comment: ['comment', 'комментарий', 'note', 'comments']
  };

  const headerLookup = Object.entries(headerAliases).reduce((acc, [field, aliases]) => {
    aliases.forEach((alias) => {
      acc[normalizeHeader(alias)] = field;
    });
    return acc;
  }, {});

  const firstRow = Array.isArray(rawRows[0]) ? rawRows[0] : null;
  const hasHeaderRow = firstRow?.some((value) => {
    const normalized = normalizeHeader(value);
    return Boolean(normalized && headerLookup[normalized]);
  });

  const dataRows = hasHeaderRow ? rawRows.slice(1) : rawRows;

  return dataRows.map((row, index) => {
    const item = Array.isArray(row)
      ? row.reduce((acc, value, rowIndex) => {
          const headerValue = firstRow?.[rowIndex];
          const field = headerValue ? headerLookup[normalizeHeader(headerValue)] : null;
          if (field) {
            acc[field] = value;
          }
          return acc;
        }, {})
      : row;

    return {
      id: pickValue(item, ['id', 'ID']) || `${index + 1}`,
      date: pickValue(item, ['date', 'Дата', 'createdAt']) || '',
      time: pickValue(item, ['time', 'Время']) || '',
      person: normalizePersonValue(pickValue(item, ['person', 'Кто']) || ''),
      type: pickValue(item, ['type', 'Тип']) || '',
      category: pickValue(item, ['category', 'Категория']) || '',
      amount: parseAmount(pickValue(item, ['amount', 'Сумма', 'value', 'sum']) || ''),
      comment: pickValue(item, ['comment', 'Комментарий']) || ''
    };
  });
}

function App() {
  const [startBalance, setStartBalance] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedDayTransactions, setSelectedDayTransactions] = useState([]);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const amountInputRef = useRef(null);
  const touchStartYRef = useRef(null);
  const [form, setForm] = useState(() => ({
    person: readStoredSelection(PERSON_STORAGE_KEY, 'Дима'),
    type: 'Расход',
    category: readStoredSelection(EXPENSE_CATEGORY_STORAGE_KEY, expenseCategories[0].label),
    amount: '',
    comment: ''
  }));

  const refreshTransactions = async (options = {}) => {
    const { showStatus = true, statusMessage = 'Обновлено', showLoading = true } = options;
    if (showLoading) {
      setLoading(true);
    }
    if (showStatus) {
      setStatus('');
    }

    try {
      const callbackName = `familyBudgetCallback_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const script = document.createElement('script');
      const url = `${API_URL}?callback=${callbackName}`;

      const payload = await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error('Ошибка загрузки'));
        }, 8000);

        const cleanup = () => {
          window.clearTimeout(timeout);
          delete window[callbackName];
          script.remove();
        };

        window[callbackName] = (data) => {
          cleanup();
          resolve(data);
        };

        script.src = url;
        script.onerror = () => {
          cleanup();
          reject(new Error('Ошибка загрузки'));
        };
        document.body.appendChild(script);
      });

      const parsed = normalizeTransactions(payload);
      setTransactions(parsed);
      if (showStatus) {
        setStatus(statusMessage);
      }
      return parsed;
    } catch (error) {
      console.error(error);
      setStatus('Ошибка загрузки');
      return [];
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void refreshTransactions();
  }, []);

  useEffect(() => {
    if (startBalance === null) return;
    window.localStorage.setItem(STORAGE_KEY, String(startBalance));
  }, [startBalance]);

  useEffect(() => {
    if (!status) return undefined;

    const timer = window.setTimeout(() => {
      setStatus('');
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!isAddSheetOpen) return undefined;

    const timer = window.setTimeout(() => {
      amountInputRef.current?.focus();
    }, 120);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsAddSheetOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddSheetOpen]);

  const availableMonths = useMemo(() => {
    const months = new Set([selectedMonth]);
    transactions.forEach((transaction) => {
      if (transaction.date) {
        months.add(getMonthKey(transaction.date));
      }
    });

    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    return Array.from(months).sort((a, b) => a.localeCompare(b));
  }, [selectedMonth, transactions]);

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1] || selectedMonth);
    }
  }, [availableMonths, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => getMonthKey(transaction.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  const totals = useMemo(() => calculateTotals(filteredTransactions), [filteredTransactions]);
  const totalIncome = totals.income;
  const totalExpense = totals.expense;

  const currentBalance = useMemo(() => {
    return (startBalance ?? 0) + transactions.filter((t) => t.type === 'Доход').reduce((sum, t) => sum + t.amount, 0) - transactions.filter((t) => t.type === 'Расход').reduce((sum, t) => sum + t.amount, 0);
  }, [startBalance, transactions]);

  const expenseBreakdown = useMemo(() => calculateExpenseBreakdown(filteredTransactions), [filteredTransactions]);
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
    const transactionsByDay = filteredTransactions.reduce((acc, transaction) => {
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
      const expenseTotals = dayTransactions
        .filter((transaction) => transaction.type === 'Расход')
        .reduce((acc, transaction) => {
          acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
          return acc;
        }, {});
      const sortedCategories = Object.entries(expenseTotals)
        .sort((a, b) => b[1] - a[1]);
      const topCategories = sortedCategories.slice(0, 2);
      const extraCategoryCount = Math.max(0, sortedCategories.length - topCategories.length);

      return {
        dayKey,
        date: currentDate,
        day: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month - 1,
        isToday: dayKey === todayKey,
        transactions: dayTransactions,
        totalExpense: dayTransactions
          .filter((transaction) => transaction.type === 'Расход')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        totalIncome: dayTransactions
          .filter((transaction) => transaction.type === 'Доход')
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        topCategories,
        extraCategoryCount
      };
    });
  }, [filteredTransactions, selectedMonth]);

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
    if (!search) return transactions;

    return transactions.filter((transaction) => {
      const haystack = `${transaction.category || ''} ${transaction.comment || ''}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [historySearch, transactions]);

  const categoryOptions = form.type === 'Расход' ? expenseCategories : incomeCategories;

  const handleBalanceSave = (event) => {
    event.preventDefault();
    const value = Number(event.target.balance.value);
    if (!Number.isFinite(value)) return;
    setStartBalance(value);
    setView('home');
    setStatus('Начальный баланс сохранён');
  };

  const handleOpenAddSheet = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setForm({
        person: normalizePersonValue(transaction.person || 'Дима'),
        type: transaction.type || 'Расход',
        category: transaction.category || expenseCategories[0].label,
        amount: String(transaction.amount || ''),
        comment: transaction.comment || ''
      });
    } else {
      setEditingTransaction(null);
      setForm((prev) => ({
        ...prev,
        person: readStoredSelection(PERSON_STORAGE_KEY, prev.person || 'Дима'),
        type: 'Расход',
        category: readStoredSelection(EXPENSE_CATEGORY_STORAGE_KEY, expenseCategories[0].label)
      }));
    }
    setIsAddSheetOpen(true);
  };

  const handleCloseAddSheet = () => {
    setIsAddSheetOpen(false);
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
      const nextCategory = value === 'Расход'
        ? readStoredSelection(EXPENSE_CATEGORY_STORAGE_KEY, expenseCategories[0].label)
        : readStoredSelection(INCOME_CATEGORY_STORAGE_KEY, incomeCategories[0].label);
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
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete',
          id: selectedTransaction.id
        })
      });
      setIsTransactionDetailOpen(false);
      setIsDeleteConfirmOpen(false);
      setSelectedTransaction(null);
      setStatus('Удалено');
      window.setTimeout(() => {
        void refreshTransactions({ showStatus: false });
      }, 1000);
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Не удалось удалить');
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const amount = parseAmount(form.amount);
    if (!amount) return;

    const isEditing = Boolean(editingTransaction);
    const payload = isEditing
      ? {
          action: 'update',
          id: editingTransaction.id,
          person: form.person,
          type: form.type,
          category: form.category,
          amount,
          comment: form.comment
        }
      : {
          action: 'create',
          person: form.person,
          type: form.type,
          category: form.category,
          amount,
          comment: form.comment
        };

    setIsSubmitting(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      setIsAddSheetOpen(false);
      setIsTransactionDetailOpen(false);
      setEditingTransaction(null);
      setSelectedTransaction(null);
      setForm((prev) => ({ ...prev, amount: '', comment: '' }));
      setView('home');
      setStatus(isEditing ? 'Изменено' : 'Добавлено');
      window.setTimeout(() => {
        void refreshTransactions({ showStatus: false, showLoading: false });
      }, 1000);
    } catch (error) {
      console.error(error);
      setStatus('Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWelcome = () => (
    <div className="screen welcome-screen">
      <div className="card hero-card">
        <div className="hero-badge">Новый уровень контроля</div>
        <p className="eyebrow">Добро пожаловать</p>
        <h1>Семейный бюджет</h1>
        <p>Начните с текущего баланса семьи, чтобы приложение могло считать доходы, расходы и остаток.</p>
        <form onSubmit={handleBalanceSave} className="stack">
          <label className="field">
            <span>Текущий баланс</span>
            <input name="balance" type="number" step="0.01" placeholder="0.00" autoFocus />
          </label>
          <button className="primary-btn" type="submit">Сохранить</button>
        </form>
      </div>
    </div>
  );

  const renderHome = () => (
    <HomePage
      currentBalance={currentBalance}
      selectedMonth={selectedMonth}
      availableMonths={availableMonths}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      expenseBreakdown={expenseBreakdown}
      filteredTransactions={filteredTransactions}
      formatCurrency={formatCurrency}
      formatTransactionDate={formatTransactionDate}
      getMonthLabel={getMonthLabel}
      onMonthChange={setSelectedMonth}
      onOpenTransactionDetails={handleOpenTransactionDetails}
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
      getCategoryIcon={getCategoryIcon}
    />
  );

  const renderHistory = () => (
    <HistoryPage
      transactions={filteredHistoryTransactions}
      searchValue={historySearch}
      onSearchChange={setHistorySearch}
      onSelectTransaction={handleOpenTransactionDetails}
      formatCurrency={formatCurrency}
      formatTransactionDate={formatTransactionDate}
    />
  );

  const renderAddSheet = () => {
    if (!isAddSheetOpen) return null;

    return (
      <div className="sheet-backdrop" onClick={handleCloseAddSheet}>
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
              handleCloseAddSheet();
            }
            touchStartYRef.current = null;
          }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div>
              <p className="eyebrow">{editingTransaction ? 'Изменить' : 'Новая операция'}</p>
              <h3>{editingTransaction ? 'Изменить' : 'Добавить'}</h3>
            </div>
            <button className="ghost-btn" onClick={handleCloseAddSheet}>
              Закрыть
            </button>
          </div>

          <form onSubmit={handleSubmit} className="stack sheet-body">
            <div className="card sheet-panel">
              <div className="segmented-control">
                {['Дима', 'Ида'].map((person) => (
                  <button
                    key={person}
                    type="button"
                    className={`segment-btn ${form.person === person ? 'active' : ''}`}
                    onClick={() => handleFormChange({ target: { name: 'person', value: person } })}
                  >
                    {person}
                  </button>
                ))}
              </div>

              <div className="segmented-control top-space">
                {['Расход', 'Доход'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`segment-btn ${form.type === type ? 'active' : ''}`}
                    onClick={() => handleFormChange({ target: { name: 'type', value: type } })}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="card sheet-panel">
              <p className="eyebrow">Категория</p>
              <div className="category-grid">
                {categoryOptions.map((category) => (
                  <button
                    key={category.label}
                    type="button"
                    className={`category-btn ${form.category === category.label ? 'active' : ''}`}
                    onClick={() => handleCategorySelect(category.label)}
                  >
                    <span>{category.icon}</span>
                    <strong>{category.label}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="card sheet-panel stack">
              <label className="field">
                <span>Сумма</span>
                <input
                  ref={amountInputRef}
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={handleFormChange}
                />
              </label>
              <label className="field">
                <span>Комментарий</span>
                <input name="comment" type="text" placeholder="Например, супермаркет" value={form.comment} onChange={handleFormChange} />
              </label>
            </div>

            <div className="sheet-actions">
              <button className="primary-btn" type="submit" disabled={loading || isSubmitting}>
                {isSubmitting ? 'Сохраняю…' : editingTransaction ? 'Сохранить' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
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
                      <p className="transaction-comment">{transaction.comment || `${getCategoryIcon(transaction.category)} ${transaction.type}`}</p>
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
                handleOpenAddSheet(selectedTransaction);
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
      selectedMonth={selectedMonth}
      formatCurrency={formatCurrency}
      getMonthLabel={getMonthLabel}
      onBack={() => setView('home')}
    />
  );

  const renderSettings = () => <SettingsPage />;

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
            onClick={() => setView(item.id)}
            type="button"
          >
            <span className="bottom-nav__icon">{item.icon}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  if (startBalance === null) {
    return renderWelcome();
  }

  return (
    <div className="app-shell">
      {status && <div className="toast">{status}</div>}
      {view === 'home' && renderHome()}
      {view === 'stats' && renderStats()}
      {view === 'calendar' && renderCalendar()}
      {view === 'history' && renderHistory()}
      {view === 'settings' && renderSettings()}
      {renderAddSheet()}
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
