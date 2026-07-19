import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const emailIsValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const validate = () => {
    if (!emailIsValid(email.trim())) return 'Введите корректный email.';
    if (password.length < 6) return 'Пароль должен содержать не менее 6 символов.';
    if (mode === 'signup' && password !== passwordConfirmation) return 'Пароли не совпадают.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { data } = await signUp(email, password);
        if (!data.session) {
          setNotice('Проверьте почту и подтвердите email, затем войдите в аккаунт.');
          setMode('signin');
        }
      } else {
        await signIn(email, password);
      }
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || 'Не удалось выполнить операцию. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!emailIsValid(email.trim())) {
      setError('Введите email, чтобы получить ссылку для восстановления.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await resetPassword(email);
      setNotice('Если аккаунт существует, письмо для восстановления уже отправлено.');
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || 'Не удалось отправить письмо. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="card auth-card" aria-label="Авторизация">
        <p className="eyebrow">Семейный бюджет</p>
        <h1>{mode === 'signin' ? 'С возвращением' : 'Создайте аккаунт'}</h1>
        <p className="muted">Войдите, чтобы открыть бюджет вашей семьи на этом устройстве.</p>

        <div className="auth-tabs" role="tablist" aria-label="Режим авторизации">
          <button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => switchMode('signin')} role="tab" aria-selected={mode === 'signin'}>Вход</button>
          <button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => switchMode('signup')} role="tab" aria-selected={mode === 'signup'}>Регистрация</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={submitting} />
          </label>
          <label>
            Пароль
            <span className="auth-password-field">
              <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 6 символов" disabled={submitting} />
              <button type="button" onClick={() => setShowPassword((current) => !current)} disabled={submitting}>{showPassword ? 'Скрыть' : 'Показать'}</button>
            </span>
          </label>
          {mode === 'signup' && <label>
            Повторите пароль
            <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} disabled={submitting} />
          </label>}

          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          {notice && <p className="auth-message" role="status">{notice}</p>}

          <button className="primary-btn auth-submit" type="submit" disabled={submitting}>{submitting ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</button>
        </form>

        {mode === 'signin' && <button className="text-action auth-reset" type="button" onClick={handleReset} disabled={submitting}>Не помню пароль</button>}
      </section>
    </main>
  );
}

export default AuthPage;
