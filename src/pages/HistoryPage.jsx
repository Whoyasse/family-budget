import { useMemo, useState } from 'react';
import { parseDate } from '../utils/date';

function formatHistoryGroupLabel(dateValue) {
  const parsed = parseDate(dateValue);
  if (!parsed) return 'Без даты';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

  if (startOfDate.getTime() === startOfToday.getTime()) return 'Сегодня';
  if (startOfDate.getTime() === startOfYesterday.getTime()) return 'Вчера';

  return parsed.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function HistoryPage({
  transactions,
  searchValue,
  onSearchChange,
  filters,
  filterOptions,
  onFiltersChange,
  onSelectTransaction,
  formatCurrency,
  formatTransactionDate,
  getCategoryIconValue
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const updateFilter = (name, value) => onFiltersChange({ ...filters, [name]: value });
  const clearFilters = () => onFiltersChange({ person: '', type: '', category: '', dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const groupedTransactions = useMemo(() => {
    const groups = transactions.reduce((acc, transaction) => {
      const parsedDate = parseDate(transaction.date);
      const key = parsedDate ? `${parsedDate.getFullYear()}-${parsedDate.getMonth()}-${parsedDate.getDate()}` : 'unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([key, items]) => ({
        key,
        label: formatHistoryGroupLabel(items[0].date),
        transactions: items.sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0))
      }))
      .sort((a, b) => (parseDate(b.transactions[0].date)?.getTime() || 0) - (parseDate(a.transactions[0].date)?.getTime() || 0));
  }, [transactions]);

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">История</p>
          <h2>История</h2>
        </div>
      </header>

      <section className="card history-filters">
        <label className="field">
          <span>Поиск</span>
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Дата, категория или поиск"
          />
        </label>
        <button type="button" className={`history-filter-toggle ${activeFilterCount ? 'active' : ''}`} onClick={() => setIsFiltersOpen((current) => !current)}>
          {'⚙️ Фильтры'}{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
        {isFiltersOpen ? <div className="history-filter-panel">
          <label className="field"><span>Человек</span><select value={filters.person} onChange={(event) => updateFilter('person', event.target.value)}><option value="">Все</option>{filterOptions.people.map((person) => <option key={person.id} value={person.id}>{person.avatar} {person.name}{person.archived ? ' · Архив' : ''}</option>)}</select></label>
          <label className="field"><span>Тип операции</span><select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}><option value="">Все</option><option value="Расход">Расход</option><option value="Доход">Доход</option></select></label>
          <label className="field history-filter-panel__wide"><span>Категория</span><select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">Все категории</option>{filterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="field"><span>Дата от</span><input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} /></label>
          <label className="field"><span>Дата до</span><input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} /></label>
          <label className="field"><span>Сумма от</span><input type="number" min="0" inputMode="decimal" value={filters.amountFrom} onChange={(event) => updateFilter('amountFrom', event.target.value)} placeholder="0" /></label>
          <label className="field"><span>Сумма до</span><input type="number" min="0" inputMode="decimal" value={filters.amountTo} onChange={(event) => updateFilter('amountTo', event.target.value)} placeholder="0" /></label>
          <button type="button" className="text-action history-filter-panel__clear" onClick={clearFilters}>Очистить фильтры</button>
        </div> : null}
      </section>

      <div className="stack">
        {groupedTransactions.length === 0 ? (
          <section className="card placeholder-card">
            <h3>История пуста</h3>
            <p>Операции появятся здесь после добавления.</p>
          </section>
        ) : (
          groupedTransactions.map((group) => (
            <section key={group.key} className="card">
              <div className="section-title">
                <h4>{group.label}</h4>
                <span>{group.transactions.length}</span>
              </div>
              <div className="transaction-list">
                {group.transactions.map((transaction) => (
                  <button
                    key={`${transaction.id}-${transaction.date}-${transaction.time}`}
                    type="button"
                    className="transaction-item transaction-item--interactive"
                    onClick={() => onSelectTransaction(transaction)}
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
                      <p>{formatTransactionDate(transaction.date, transaction.time)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
