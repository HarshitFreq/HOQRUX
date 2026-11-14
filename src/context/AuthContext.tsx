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
  savedAccounts: UserAccount[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchAccount: (userId: string) => Promise<void>;
  connectSupabase: (url: string, anonKey: string) => Promise<boolean>;
  disconnectSupabase: () => Promise<void>;
  triggerSync: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_CREDS_KEY = '@hoqrux_local_creds_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount>(GUEST_USER);
  const [savedAccounts, setSavedAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'local_only'>('local_only');

  const isCloudConnected = supabaseService.isConfigured();

  // Load session on startup
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const [currentUser, accounts] = await Promise.all([
          databaseService.getCurrentUser(),
          databaseService.getRegisteredUsers(),
        ]);

        if (!isMounted) return;
        setSavedAccounts(accounts);

        // Check if Supabase has an active session
        const supabase = supabaseService.getClient();
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

    return () => {
      isMounted = false;
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
          await databaseService.migrateGuestDataToUser(loggedInUser.id);
          const updatedAccounts = await databaseService.getRegisteredUsers();
          setSavedAccounts(updatedAccounts);
          setCloudSyncStatus('synced');
          setLoading(false);
          void databaseService.fullCloudSync(loggedInUser);
          return { success: true };
        }
      } catch (err) {
        console.warn('[Auth] Supabase signIn exception, falling back to local:', err);
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
        await databaseService.migrateGuestDataToUser(localUser.id);
        const updatedAccounts = await databaseService.getRegisteredUsers();
        setSavedAccounts(updatedAccounts);
        setCloudSyncStatus(isCloudConnected ? 'synced' : 'local_only');
        setLoading(false);
        if (isCloudConnected) {
          void databaseService.fullCloudSync(localUser);
        }
        return { success: true };
      }

      // If user doesn't exist locally, offer auto-signup
      const newUserId = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const newUser: UserAccount = {
        id: newUserId,
        email: cleanEmail,
        username: cleanEmail.split('@')[0].toUpperCase(),
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
      const updatedAccounts = await databaseService.getRegisteredUsers();
      setSavedAccounts(updatedAccounts);
      setCloudSyncStatus(isCloudConnected ? 'synced' : 'local_only');
      setLoading(false);
      if (isCloudConnected) {
        void databaseService.fullCloudSync(newUser);
      }
      return { success: true };
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

        if (!error && data?.user) {
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
          const updatedAccounts = await databaseService.getRegisteredUsers();
          setSavedAccounts(updatedAccounts);
          setCloudSyncStatus('synced');
          setLoading(false);
          void databaseService.fullCloudSync(newUser);
          return { success: true };
        }
      } catch (err) {
        console.warn('[Auth] Supabase signup exception, falling back to local registration:', err);
      }
    }

    // 2. Local-First Registration fallback
    try {
      const credsRaw = await AsyncStorage.getItem(LOCAL_CREDS_KEY);
      const creds: Record<string, { id: string; email: string; username: string; pass: string; createdAt: string }> =
        credsRaw ? JSON.parse(credsRaw) : {};

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
      const updatedAccounts = await databaseService.getRegisteredUsers();
      setSavedAccounts(updatedAccounts);
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

  // Switch between existing saved accounts on device
  const switchAccount = useCallback(async (targetUserId: string) => {
    if (targetUserId === 'guest') {
      await signOut();
      return;
    }
    const accounts = await databaseService.getRegisteredUsers();
    const target = accounts.find((a) => a.id === targetUserId);
    if (target) {
      setLoading(true);
      setUser(target);
      await databaseService.setCurrentUser(target);
      setCloudSyncStatus(supabaseService.isConfigured() ? 'synced' : 'local_only');
      setLoading(false);
      if (supabaseService.isConfigured()) {
        void databaseService.fullCloudSync(target);
      }
    }
  }, [signOut]);

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
            await databaseService.migrateGuestDataToUser(authUser.id);
            setCloudSyncStatus('synced');
            void databaseService.fullCloudSync(authUser);
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
    savedAccounts,
    loading,
    signIn,
    signUp,
    signOut,
    switchAccount,
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
