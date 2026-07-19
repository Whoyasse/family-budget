import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { clearLegacyUsersAfterMigration, readLegacyUsersForMigration } from '../utils/settingsStorage';
import { useAuth } from './AuthContext';

const HouseholdContext = createContext(null);

const normalizeBudgetUser = (user) => ({
  id: user.id,
  name: user.name || '',
  avatar: user.avatar || '🧑',
  archived: false,
  createdAt: user.created_at || new Date().toISOString()
});

export function HouseholdProvider({ children }) {
  const { authUser } = useAuth();
  const [state, setState] = useState({ householdId: null, household: null, membershipRole: null, budgetUsers: [], loading: true, onboardingCompleted: null });

  const loadBudgetUsers = useCallback(async (householdId) => {
    const { data, error } = await supabase.from('budget_users').select('id, name, avatar, created_at').eq('household_id', householdId).order('created_at');
    if (error) throw error;
    return (data || []).map(normalizeBudgetUser);
  }, []);

  const createBudgetUser = useCallback(async ({ name, avatar = '🧑' }) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Введите имя участника.');
    if (!state.householdId) throw new Error('Семья не найдена.');
    const { data, error } = await supabase.from('budget_users').insert({ household_id: state.householdId, name: cleanName, avatar }).select('id, name, avatar, created_at').single();
    if (error) throw error;
    const user = normalizeBudgetUser(data);
    setState((current) => ({ ...current, budgetUsers: [...current.budgetUsers, user] }));
    return user;
  }, [state.householdId]);

  const updateBudgetUser = useCallback(async (userId, { name, avatar }) => {
    const currentUser = state.budgetUsers.find((user) => user.id === userId);
    const cleanName = name.trim();
    if (!currentUser || !cleanName) throw new Error('Введите имя участника.');
    if (cleanName !== currentUser.name) {
      const { error: aliasError } = await supabase.from('budget_user_aliases').upsert({ budget_user_id: userId, name: currentUser.name }, { onConflict: 'budget_user_id,name' });
      if (aliasError) console.error(aliasError);
    }
    const { data, error } = await supabase.from('budget_users').update({ name: cleanName, avatar }).eq('id', userId).eq('household_id', state.householdId).select('id, name, avatar, created_at').single();
    if (error) throw error;
    const updated = normalizeBudgetUser(data);
    setState((current) => ({ ...current, budgetUsers: current.budgetUsers.map((user) => user.id === userId ? updated : user) }));
    return updated;
  }, [state.budgetUsers, state.householdId]);

  const deleteBudgetUser = useCallback(async (userId) => {
    if (!state.householdId) throw new Error('Семья не найдена.');
    const { error } = await supabase.from('budget_users').delete().eq('id', userId).eq('household_id', state.householdId);
    if (error) throw error;
    setState((current) => ({ ...current, budgetUsers: current.budgetUsers.filter((user) => user.id !== userId) }));
  }, [state.householdId]);

  const updateHouseholdName = useCallback(async (name) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Введите название семьи.');
    if (!state.householdId) throw new Error('Семья не найдена.');
    const { data, error } = await supabase.from('households').update({ name: cleanName }).eq('id', state.householdId).select('id, name').single();
    if (error) throw error;
    setState((current) => ({ ...current, household: data }));
    return data;
  }, [state.householdId]);

  const refreshHousehold = useCallback(async () => {
    if (!authUser) {
      setState({ householdId: null, household: null, membershipRole: null, budgetUsers: [], loading: false, onboardingCompleted: null });
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    const { data, error } = await supabase.from('household_members').select('household_id, role, households(id, name)').eq('auth_user_id', authUser.id).limit(1).maybeSingle();
    if (error) console.error(error);
    let budgetUsers = [];
    let onboardingCompleted = false;
    if (data?.household_id) {
      try {
        const { data: settingsRow, error: settingsError } = await supabase.from('household_settings').select('onboarding_completed').eq('household_id', data.household_id).maybeSingle();
        if (settingsError) throw settingsError;
        onboardingCompleted = settingsRow?.onboarding_completed ?? false;
        if (!settingsRow) {
          const { error: initializeError } = await supabase.from('household_settings').upsert({ household_id: data.household_id, onboarding_completed: onboardingCompleted }, { onConflict: 'household_id' });
          if (initializeError) throw initializeError;
        }
        budgetUsers = await loadBudgetUsers(data.household_id);
        if (!budgetUsers.length) {
          const legacyUsers = readLegacyUsersForMigration();
          for (const legacyUser of legacyUsers) {
            const { data: created, error: createError } = await supabase.from('budget_users').insert({ household_id: data.household_id, name: legacyUser.name, avatar: legacyUser.avatar }).select('id, name, avatar, created_at').single();
            if (createError) throw createError;
            budgetUsers.push(normalizeBudgetUser(created));
          }
          clearLegacyUsersAfterMigration();
        }
      } catch (loadError) { console.error(loadError); }
    }
    setState({ householdId: data?.household_id || null, household: data?.households || null, membershipRole: data?.role || null, budgetUsers, loading: false, onboardingCompleted });
  }, [authUser, loadBudgetUsers]);

  const completeOnboarding = useCallback(async () => {
    if (!state.householdId) throw new Error('Семья не найдена.');
    const { data, error } = await supabase
      .from('household_settings')
      .update({ onboarding_completed: true })
      .eq('household_id', state.householdId)
      .select('household_id, onboarding_completed')
      .maybeSingle();
    if (error) throw error;
    if (!data?.onboarding_completed) throw new Error('Не удалось подтвердить завершение настройки семьи.');
    setState((current) => ({ ...current, onboardingCompleted: true }));
  }, [state.householdId]);
  const restartOnboarding = useCallback(async () => {
    if (!state.householdId) throw new Error('Семья не найдена.');
    const { error } = await supabase.from('household_settings').update({ onboarding_completed: false }).eq('household_id', state.householdId);
    if (error) throw error;
    setState((current) => ({ ...current, onboardingCompleted: false }));
  }, [state.householdId]);
  useEffect(() => { refreshHousehold(); }, [refreshHousehold]);

  return <HouseholdContext.Provider value={{ ...state, refreshHousehold, completeOnboarding, restartOnboarding, updateHouseholdName, createBudgetUser, updateBudgetUser, deleteBudgetUser }}>{children}</HouseholdContext.Provider>;
}

export const useHousehold = () => useContext(HouseholdContext);
