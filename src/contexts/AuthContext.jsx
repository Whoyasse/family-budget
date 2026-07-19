import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const message = (error) => ({ 'Invalid login credentials': 'Неверный email или пароль', 'User already registered': 'Аккаунт с таким email уже существует', 'Password should be at least 6 characters': 'Пароль должен содержать не менее 6 символов', 'Email not confirmed': 'Сначала подтвердите email' }[error?.message] || 'Не удалось выполнить операцию. Попробуйте ещё раз.');
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.auth.getSession().then(({ data, error }) => { if (error) console.error(error); setSession(data.session); setLoading(false); }); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); }); return () => subscription.unsubscribe(); }, []);
  const value = useMemo(() => ({ session, authUser: session?.user || null, loading, signUp: async (email, password) => { const result = await supabase.auth.signUp({ email: email.trim(), password }); if (result.error) throw new Error(message(result.error)); return result; }, signIn: async (email, password) => { const result = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (result.error) throw new Error(message(result.error)); return result; }, signOut: () => supabase.auth.signOut(), resetPassword: async (email) => { const result = await supabase.auth.resetPasswordForEmail(email.trim()); if (result.error) throw new Error(message(result.error)); } }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
