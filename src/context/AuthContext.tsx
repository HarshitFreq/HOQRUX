import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService, UserAccount, GUEST_USER } from '../services/database';
import { supabaseService } from '../services/supabase';

interface AuthContextType {
  user: UserAccount;
  isAuthenticated: boolean;
  isGuest: boolean;
  isCloudConnected: boolean;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'local_only';
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  connectSupabase: (url: string, anonKey: string) => Promise<boolean>;
  disconnectSupabase: () => Promise<void>;
  triggerSync: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_CREDS_KEY = '@hoqrux_local_creds_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount>(GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'local_only'>('local_only');

  const isCloudConnected = supabaseService.isConfigured();

  // Load session on startup and subscribe to auth changes
  useEffect(() => {
    let isMounted = true;
    const supabase = supabaseService.getClient();

    async function loadSession() {
      try {
        const currentUser = await databaseService.getCurrentUser();
        if (!isMounted) return;

        // Check if Supabase has an active session
        if (supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            if (isMounted && data?.session?.user) {
              const authUser: UserAccount = {
                id: data.session.user.id,
                email: data.session.user.email || '',
                username: data.session.user.user_metadata?.username || data.session.user.email?.split('@')[0] || 'User',
                createdAt: data.session.user.created_at || new Date().toISOString(),
                isGuest: false,
              };
              setUser(authUser);
              await databaseService.setCurrentUser(authUser);
              setCloudSyncStatus('synced');
              setLoading(false);
              void databaseService.fullCloudSync(authUser);
              return;
            }
          } catch {
            // Ignore session check errors
          }
        }

        setUser(currentUser);
        setCloudSyncStatus(isCloudConnected && !currentUser.isGuest ? 'synced' : 'local_only');
        if (isCloudConnected && !currentUser.isGuest) {
          void databaseService.fullCloudSync(currentUser);
        }
      } catch (e) {
        if (!isMounted) return;
        console.warn('Failed to load auth session:', e);
        setUser(GUEST_USER);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
          const authUser: UserAccount = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
            createdAt: session.user.created_at || new Date().toISOString(),
            isGuest: false,
          };
          setUser(authUser);
          await databaseService.setCurrentUser(authUser);
          setCloudSyncStatus('synced');
          void databaseService.fullCloudSync(authUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(GUEST_USER);
          await databaseService.setCurrentUser(GUEST_USER);
          setCloudSyncStatus('local_only');
        }
      });
      authSubscription = listener.subscription;
    }

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, [isCloudConnected]);

  // Sign In
  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    setLoading(true);

    // 1. Try Supabase Auth first if configured
    const supabase = supabaseService.getClient();
    if (supabase) {
      try {
        setCloudSyncStatus('syncing');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          console.warn('[Auth] Supabase signIn error:', error.message, error.status);
          const errMsg = (error.message || '').toLowerCase();
          if (errMsg.includes('email not confirmed') || (error as any).code === 'email_not_confirmed') {
            setLoading(false);
            setCloudSyncStatus('local_only');
            return {
              success: false,
              error: 'Email address not confirmed. Please check your inbox and verify your email before signing in.',
            };
          }
          if (errMsg.includes('invalid login credentials') || errMsg.includes('invalid credentials')) {
            const credsRaw = await AsyncStorage.getItem(LOCAL_CREDS_KEY);
            const creds = credsRaw ? JSON.parse(credsRaw) : {};
            if (!creds[cleanEmail]) {
              setLoading(false);
              setCloudSyncStatus('local_only');
              return {
                success: false,
                error: 'Invalid email or password. Please verify your credentials or create an account.',
              };
            }
          }
        }

        if (!error && data?.user) {
          const loggedInUser: UserAccount = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            username: data.user.user_metadata?.username || cleanEmail.split('@')[0].toUpperCase(),
            createdAt: data.user.created_at || new Date().toISOString(),
            isGuest: false,
          };
          setUser(loggedInUser);
          await databaseService.setCurrentUser(loggedInUser);

          // PULL all cloud database records into local storage BEFORE completing sign-in!
          try {
            await databaseService.fullCloudSync(loggedInUser);
          } catch (syncErr) {
            console.warn('[Auth] fullCloudSync warning on signIn:', syncErr);
          }

          setCloudSyncStatus('synced');
          setLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('[Auth] Supabase signIn exception, checking local fallback:', err);
      }
    }

    // 2. Local-First Multi-Account Authentication fallback
    try {
      const credsRaw = await AsyncStorage.getItem(LOCAL_CREDS_KEY);
      const creds: Record<string, { id: string; email: string; username: string; pass: string; createdAt: string }> =
        credsRaw ? JSON.parse(credsRaw) : {};

      const existingCred = creds[cleanEmail];
      if (existingCred) {
        if (existingCred.pass !== password) {
          setLoading(false);
          return { success: false, error: 'Incorrect password.' };
        }
        const localUser: UserAccount = {
          id: existingCred.id,
          email: existingCred.email,
          username: existingCred.username,
          createdAt: existingCred.createdAt,
          isGuest: false,
        };
        setUser(localUser);
        await databaseService.setCurrentUser(localUser);
        if (isCloudConnected) {
          try {
            await databaseService.fullCloudSync(localUser);
          } catch (syncErr) {
            console.warn('[Auth] fullCloudSync warning on local login:', syncErr);
          }
        }
        setCloudSyncStatus(isCloudConnected ? 'synced' : 'local_only');
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Account not found. Please check your credentials or create an account.' };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message || 'Sign in failed. Check your password.' };
    }
  }, [isCloudConnected]);

  // Sign Up
  const signUp = useCallback(async (email: string, password: string, username?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    setLoading(true);
    const displayName = (username || cleanEmail.split('@')[0]).trim().toUpperCase();

    // 1. Try Supabase Auth
    const supabase = supabaseService.getClient();
    if (supabase) {
      try {
        setCloudSyncStatus('syncing');
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { username: displayName },
          },
        });

        if (error) {
          console.warn('[Auth] Supabase signUp error:', error.message);
          setLoading(false);
          setCloudSyncStatus('local_only');
          return { success: false, error: error.message };
        }

        if (data?.user) {
          // Check if user already exists (identities empty)
          if (data.user.identities && data.user.identities.length === 0) {
            setLoading(false);
            return {
              success: false,
              error: 'An account with this email already exists. Please sign in instead.',
            };
          }

          // If session is null, email confirmation is enabled in Supabase
          if (!data.session) {
            setLoading(false);
            return {
              success: false,
              error: 'Verification email sent! Please check your inbox and confirm your email before signing in.',
            };
          }

          const newUser: UserAccount = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            username: displayName,
            createdAt: data.user.created_at || new Date().toISOString(),
            isGuest: false,
          };
          setUser(newUser);
          await databaseService.setCurrentUser(newUser);
          await databaseService.migrateGuestDataToUser(newUser.id);
          setCloudSyncStatus('synced');
          setLoading(false);
          try {
            await databaseService.fullCloudSync(newUser);
          } catch (syncErr) {
            console.warn('[Auth] fullCloudSync warning on signUp:', syncErr);
          }
          return { success: true };
        }
      } catch (err: any) {
        console.warn('[Auth] Supabase signup exception:', err);
      }
    }

    // 2. Local-First Registration fallback
    try {
      const credsRaw = await AsyncStorage.getItem(LOCAL_CREDS_KEY);
      const creds: Record<string, { id: string; email: string; username: string; pass: string; createdAt: string }> =
        credsRaw ? JSON.parse(credsRaw) : {};

      if (creds[cleanEmail]) {
        setLoading(false);
        return { success: false, error: 'An account with this email already exists locally. Please sign in.' };
      }

      const newUserId = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const newUser: UserAccount = {
        id: newUserId,
        email: cleanEmail,
        username: displayName,
        createdAt: new Date().toISOString(),
        isGuest: false,
      };

      creds[cleanEmail] = {
        ...newUser,
        pass: password,
      };

      await AsyncStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(creds));
      setUser(newUser);
      await databaseService.setCurrentUser(newUser);
      await databaseService.migrateGuestDataToUser(newUser.id);
      setCloudSyncStatus(isCloudConnected ? 'synced' : 'local_only');
      setLoading(false);
      if (isCloudConnected) {
        void databaseService.fullCloudSync(newUser);
      }
      return { success: true };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message || 'Unable to create account.' };
    }
  }, [isCloudConnected]);

  // Sign Out
  const signOut = useCallback(async () => {
    setLoading(true);
    const supabase = supabaseService.getClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
    setUser(GUEST_USER);
    await databaseService.setCurrentUser(GUEST_USER);
    setCloudSyncStatus('local_only');
    setLoading(false);
  }, []);

  // Delete Account (Google Play Mandate: Complete Purge of User & Data)
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const currentUserId = user.id;

      // 1. Delete user-scoped data across local storage & Supabase
      await databaseService.deleteUserData(currentUserId);

      // 2. Remove credentials from local registry if present
      try {
        const credsRaw = await AsyncStorage.getItem(LOCAL_CREDS_KEY);
        if (credsRaw && user.email) {
          const creds = JSON.parse(credsRaw);
          delete creds[user.email.toLowerCase()];
          await AsyncStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(creds));
        }
      } catch {
        // Ignore
      }

      // 3. Sign out of Supabase session
      const supabase = supabaseService.getClient();
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore
        }
      }

      // 4. Reset to clean Guest user
      setUser(GUEST_USER);
      await databaseService.setCurrentUser(GUEST_USER);
      setCloudSyncStatus('local_only');
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Failed to delete account.' };
    }
  }, [user]);

  // Connect Supabase Cloud
  const connectSupabase = useCallback(async (url: string, anonKey: string): Promise<boolean> => {
    const success = await supabaseService.saveConfig(url, anonKey);
    if (success) {
      setCloudSyncStatus('syncing');
      const supabase = supabaseService.getClient();
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const authUser: UserAccount = {
              id: data.session.user.id,
              email: data.session.user.email || '',
              username: data.session.user.user_metadata?.username || data.session.user.email?.split('@')[0] || 'User',
              createdAt: data.session.user.created_at || new Date().toISOString(),
              isGuest: false,
            };
            setUser(authUser);
            await databaseService.setCurrentUser(authUser);
            setCloudSyncStatus('synced');
            await databaseService.fullCloudSync(authUser);
            return true;
          }
        } catch {
          // Ignore
        }
      }
      if (!user.isGuest) {
        setCloudSyncStatus('synced');
        void databaseService.fullCloudSync(user);
      }
      return true;
    }
    return false;
  }, [user]);

  // Disconnect Supabase Cloud
  const disconnectSupabase = useCallback(async () => {
    await supabaseService.clearConfig();
    setCloudSyncStatus('local_only');
  }, []);

  // Trigger manual cloud sync
  const triggerSync = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (user.isGuest) {
      return { success: false, message: 'Guest account cannot sync to cloud. Sign in to an account first.' };
    }
    if (!supabaseService.isConfigured()) {
      return { success: false, message: 'Supabase cloud is not configured.' };
    }
    setCloudSyncStatus('syncing');
    try {
      const res = await databaseService.fullCloudSync(user);
      if (res.success) {
        setCloudSyncStatus('synced');
        return {
          success: true,
          message: `Synced ${res.trackingCount ?? 0} titles, ${res.watchlistsCount ?? 0} lists, ${res.historyCount ?? 0} logs to Supabase.`,
        };
      } else {
        setCloudSyncStatus('offline');
        return {
          success: false,
          message: res.error || 'Failed to sync with Supabase.',
        };
      }
    } catch (e: any) {
      setCloudSyncStatus('offline');
      return { success: false, message: e?.message || 'Sync failed.' };
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user && !user.isGuest),
    isGuest: Boolean(!user || user.isGuest),
    isCloudConnected,
    cloudSyncStatus,
    loading,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    connectSupabase,
    disconnectSupabase,
    triggerSync,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
