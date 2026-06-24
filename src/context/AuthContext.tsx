"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchMember, fetchUserPreferences } from "@/lib/supabase/member";
import type { DbMember, DbUserPreferences } from "@/lib/supabase/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  member: DbMember | null;
  preferences: DbUserPreferences | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<DbMember | null>(null);
  const [preferences, setPreferences] = useState<DbUserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId: string) => {
    const [m, prefs] = await Promise.all([
      fetchMember(userId).catch(() => null),
      fetchUserPreferences(userId).catch(() => null),
    ]);
    setMember(m);
    setPreferences(prefs);
  }, []);

  const refreshMember = useCallback(async () => {
    if (!user) return;
    await loadUserData(user.id);
  }, [user, loadUserData]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserData(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserData(s.user.id);
      } else {
        setMember(null);
        setPreferences(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMember(null);
    setPreferences(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      member,
      preferences,
      loading,
      signOut,
      refreshMember,
    }),
    [user, session, member, preferences, loading, signOut, refreshMember]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
