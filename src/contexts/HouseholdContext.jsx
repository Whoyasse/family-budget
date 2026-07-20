import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { createBudgetUser as createBudgetUserRecord, loadBudgetUsers as loadBudgetUserRecords, removeBudgetUser, updateBudgetUser as updateBudgetUserRecord } from '../services/budgetUsersService';
import { loadHouseholdSettings, saveHouseholdSettings } from '../services/settingsService';
import { getSupabaseErrorDetails } from '../services/supabaseError';
import { acceptHouseholdInvite, getHouseholdAccessMembers } from '../services/householdInvitesService';
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
  const [state, setState] = useState({ householdId: null, household: null, membershipRole: null, accessMembers: [], budgetUsers: [], loading: true, onboardingCompleted: null });

  const loadBudgetUsers = useCallback(async (householdId) => {
    const data = await loadBudgetUserRecords(householdId);
    return data.map(normalizeBudgetUser);
  }, []);

  const createBudgetUser = useCallback(async ({ name, avatar = '🧑' }) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Введите имя участника.');
    if (!state.householdId) throw new Error('Семья не найдена.');
    const data = await createBudgetUserRecord(state.householdId, { name: cleanName, avatar });
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
    const data = await updateBudgetUserRecord(state.householdId, userId, { name: cleanName, avatar });
    const updated = normalizeBudgetUser(data);
    setState((current) => ({ ...current, budgetUsers: current.budgetUsers.map((user) => user.id === userId ? updated : user) }));
    return updated;
  }, [state.budgetUsers, state.householdId]);

  const deleteBudgetUser = useCallback(async (userId) => {
    if (!state.householdId) throw new Error('Семья не найдена.');
    await removeBudgetUser(state.householdId, userId);
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
      setState({ householdId: null, household: null, membershipRole: null, accessMembers: [], budgetUsers: [], loading: false, onboardingCompleted: null });
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    const { data, error } = await supabase.from('household_members').select('household_id, role, households(id, name)').eq('auth_user_id', authUser.id).limit(1).maybeSingle();
    if (error) getSupabaseErrorDetails(error, 'household_members.load');
    let budgetUsers = [];
    let accessMembers = [];
    let onboardingCompleted = false;
    if (data?.household_id) {
      try {
        const settingsRow = await loadHouseholdSettings(data.household_id);
        onboardingCompleted = settingsRow?.onboarding_completed ?? false;
        if (!settingsRow) {
          await saveHouseholdSettings(data.household_id, { onboarding_completed: false });
        }
        budgetUsers = await loadBudgetUsers(data.household_id);
        accessMembers = await getHouseholdAccessMembers();
      } catch (loadError) { getSupabaseErrorDetails(loadError.supabase || loadError, 'household.bootstrap'); }
    }
    setState({ householdId: data?.household_id || null, household: data?.households || null, membershipRole: data?.role || null, accessMembers, budgetUsers, loading: false, onboardingCompleted });
  }, [authUser, loadBudgetUsers]);

  const completeOnboarding = useCallback(async () => {
    if (!state.householdId) throw new Error('Семья не найдена.');
    const data = await saveHouseholdSettings(state.householdId, { onboarding_completed: true });
    if (!data?.onboarding_completed) throw new Error('Не удалось подтвердить завершение настройки семьи.');
    setState((current) => ({ ...current, onboardingCompleted: true }));
  }, [state.householdId]);
  const restartOnboarding = useCallback(async () => {
    if (!state.householdId) throw new Error('Семья не найдена.');
    await saveHouseholdSettings(state.householdId, { onboarding_completed: false });
    setState((current) => ({ ...current, onboardingCompleted: false }));
  }, [state.householdId]);
  const joinHousehold = useCallback(async (code) => {
    await acceptHouseholdInvite(code);
    await refreshHousehold();
  }, [refreshHousehold]);
  useEffect(() => { refreshHousehold(); }, [refreshHousehold]);

  return <HouseholdContext.Provider value={{ ...state, refreshHousehold, completeOnboarding, restartOnboarding, joinHousehold, updateHouseholdName, createBudgetUser, updateBudgetUser, deleteBudgetUser }}>{children}</HouseholdContext.Provider>;
}

export const useHousehold = () => useContext(HouseholdContext);
