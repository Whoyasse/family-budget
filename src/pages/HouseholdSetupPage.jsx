import { useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { supabase } from '../lib/supabase';

function HouseholdSetupPage() {
  const { refreshHousehold, markHouseholdCreated } = useHousehold();
  const [name, setName] = useState('Моя семья');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const householdName = name.trim();
    if (!householdName) {
      setError('Введите название семьи.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('create_household', { household_name: householdName });
      if (rpcError || !data) throw rpcError || new Error('Не удалось создать семью.');
      markHouseholdCreated();
      await refreshHousehold();
    } catch (requestError) {
      console.error(requestError);
      setError('Не удалось создать семью. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="card auth-card household-card">
        <p className="eyebrow">Первый шаг</p>
        <h1>Создание семьи</h1>
        <p className="muted">Создайте пространство, в котором будут храниться общие операции, категории и настройки.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Название семьи
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength="80" autoFocus disabled={submitting} />
          </label>
          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          <button className="primary-btn auth-submit" type="submit" disabled={submitting}>{submitting ? 'Создаём…' : 'Продолжить'}</button>
        </form>
      </section>
    </main>
  );
}

export default HouseholdSetupPage;
