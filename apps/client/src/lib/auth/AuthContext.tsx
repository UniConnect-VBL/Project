"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "../supabase";
import { setTokenGetter, setErrorHandlers } from "../api";

// ============================================================================
// TYPES - Rule 2: Clear interfaces
// ============================================================================

interface AuthResult {
  error: Error | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER - Rule 6: Use @supabase/ssr
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use singleton client from @supabase/ssr
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Get access token for API calls - Rule 6: Axios interceptors
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    // Set token getter for API interceptors
    setTokenGetter(getAccessToken);

    // Set error handlers - Rule 8: Centralized error handling
    setErrorHandlers({
      onUnauthorized: () => {
        setUser(null);
        setSession(null);
      },
    });

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        // Rule 2: No console.error with any
        if (err instanceof Error) {
          console.error("Auth init error:", err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, getAccessToken]);

  // ============================================================================
  // AUTH METHODS
  // ============================================================================

  /**
   * Sign in with Google OAuth
   * @returns AuthResult with error or null
   */
  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown error occurred");
      return { error };
    }
  }, [supabase]);

  /**
   * Sign in with email/password
   * @param email - User email address
   * @param password - User password
   * @returns AuthResult with error or null
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error: new Error(error.message) };
        }
        return { error: null };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        return { error };
      }
    },
    [supabase]
  );

  /**
   * Sign up with email/password
   * @param email - User email address
   * @param password - User password
   * @returns AuthResult with error or null
   */
  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          return { error: new Error(error.message) };
        }
        return { error: null };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        return { error };
      }
    },
    [supabase]
  );

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      // Redirect to home page
      window.location.href = "/";
    } catch (err) {
      // Log error without exposing details
      if (err instanceof Error) {
        console.error("Sign out failed:", err.message);
      }
    }
  }, [supabase]);

  /**
   * Refresh current session
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch (err) {
      // Log error without exposing details
      if (err instanceof Error) {
        console.error("Session refresh failed:", err.message);
      }
    }
  }, [supabase]);

  // ============================================================================
  // CONTEXT VALUE (Memoized for performance)
  // ============================================================================

  const isAuthenticated = !!user && !!session;

  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshSession,
    }),
    [
      user,
      session,
      loading,
      isAuthenticated,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
