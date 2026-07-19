import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
const HouseholdContext = createContext(null);

export function HouseholdProvider({ children }) {
  const { authUser } = useAuth();
  const [state, setState] = useState({ householdId: null, household: null, membershipRole: null, loading: true, createdHousehold: false });

  const refreshHousehold = useCallback(async () => {
    if (!authUser) {
      setState({ householdId: null, household: null, membershipRole: null, loading: false, createdHousehold: false });
      return;
    }

    setState((current) => ({ ...current, loading: true }));
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, role, households(id, name)')
      .eq('auth_user_id', authUser.id)
      .limit(1)
      .maybeSingle();
    if (error) console.error(error);

    setState((current) => ({
      householdId: data?.household_id || null,
      household: data?.households || null,
      membershipRole: data?.role || null,
      loading: false,
      createdHousehold: current.createdHousehold
    }));
  }, [authUser]);

  const markHouseholdCreated = useCallback(() => {
    setState((current) => ({ ...current, createdHousehold: true }));
  }, []);

  useEffect(() => { refreshHousehold(); }, [refreshHousehold]);

  return <HouseholdContext.Provider value={{ ...state, refreshHousehold, markHouseholdCreated }}>{children}</HouseholdContext.Provider>;
}
export const useHousehold = () => useContext(HouseholdContext);
