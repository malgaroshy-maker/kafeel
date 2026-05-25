import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'manager' | 'staff' | 'accountant' | 'monitor' | 'admin' | 'none';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isManager: boolean;
  isAccountant: boolean;
  isStaff: boolean;
  isMonitor: boolean;
  isAdmin: boolean;
  officeId: string | null;
  officeName: string | null;
  displayName: string | null;
  planType: 'BASIC' | 'PREMIUM' | 'UNLIMITED';
  isLoading: boolean;
  acceptedTerms: boolean;
  acceptedTermsAt: string | null;
  setAcceptedTerms: (accepted: boolean, date?: string | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Resolve role from user_profiles table (more reliable than app_metadata)
async function resolveUserProfile(userId: string): Promise<{ role: UserRole; officeId: string | null; officeName: string | null; displayName: string | null; planType: 'BASIC' | 'PREMIUM' | 'UNLIMITED'; acceptedTerms: boolean; acceptedTermsAt: string | null }> {
  const { data } = await supabase
    .from('user_profiles')
    .select('role, office_id, display_name, accepted_terms, accepted_terms_at, offices(name, plan_type)')
    .eq('id', userId)
    .single();

  if (data) {
    return {
      role: (data.role as UserRole) || 'none',
      officeId: data.office_id,
      officeName: (data.offices as any)?.name || null,
      displayName: data.display_name || null,
      planType: (data.offices as any)?.plan_type || 'BASIC',
      acceptedTerms: !!data.accepted_terms,
      acceptedTermsAt: data.accepted_terms_at || null,
    };
  }
  return { role: 'none', officeId: null, officeName: null, displayName: null, planType: 'BASIC', acceptedTerms: false, acceptedTermsAt: null };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>('none');
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [officeName, setOfficeName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'BASIC' | 'PREMIUM' | 'UNLIMITED'>('BASIC');
  const [isLoading, setIsLoading] = useState(true);

  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [acceptedTermsAt, setAcceptedTermsAt] = useState<string | null>(null);

  const loadProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setRole('none');
      setOfficeId(null);
      setOfficeName(null);
      setAcceptedTerms(false);
      setAcceptedTermsAt(null);
      setIsLoading(false);
      return;
    }

    // Try app_metadata first (fast), then verify with user_profiles
    const metaRole = (currentUser.app_metadata?.role as UserRole) ?? 'none';
    const metaOffice = currentUser.app_metadata?.office_id ?? null;

    // Set immediately from metadata for fast render
    setRole(metaRole);
    setOfficeId(metaOffice);

    // Then verify/update from database
    try {
      const profile = await resolveUserProfile(currentUser.id);
      if (profile.role !== 'none') {
        setRole(profile.role);
        setOfficeId(profile.officeId);
        setOfficeName(profile.officeName);
        setDisplayName(profile.displayName);
        setPlanType(profile.planType);
        setAcceptedTerms(profile.acceptedTerms);
        setAcceptedTermsAt(profile.acceptedTermsAt);
      }
    } catch {
      // Fallback if fails
    }
    setIsLoading(false);
  };

  const updateAcceptedTerms = (accepted: boolean, date?: string | null) => {
    setAcceptedTerms(accepted);
    if (accepted) {
      setAcceptedTermsAt(date || new Date().toISOString());
    } else {
      setAcceptedTermsAt(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Synchronize profile role updates on-the-fly to solve JWT caching drift
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-role-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload: any) => {
          const newRole = payload.new?.role;
          if (newRole && newRole !== role) {
            console.log('Role update detected on database. Refreshing session on-the-fly...');
            await supabase.auth.refreshSession();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, role]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      isManager: role === 'manager',
      isAccountant: role === 'accountant',
      isStaff: role === 'staff',
      isMonitor: role === 'monitor',
      isAdmin: role === 'admin',
      officeId, 
      officeName,
      displayName,
      planType,
      isLoading, 
      acceptedTerms,
      acceptedTermsAt,
      setAcceptedTerms: updateAcceptedTerms,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
