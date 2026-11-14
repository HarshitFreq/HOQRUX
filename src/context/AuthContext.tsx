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
  triggerSync: () => Promise<boolean>;
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
          const { data } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (data.session?.user) {
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
            return;
          }
        }

        setUser(currentUser);
        setCloudSyncStatus(isCloudConnected && !currentUser.isGuest ? 'synced' : 'local_only');
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

    // 1. Try Supabase if configured
    const supabase = supabaseService.getClient();
    if (supabase) {
      try {
        setCloudSyncStatus('syncing');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setCloudSyncStatus('offline');
          setLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const loggedInUser: UserAccount = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            username: data.user.user_metadata?.username || cleanEmail.split('@')[0],
            createdAt: data.user.created_at || new Date().toISOString(),
            isGuest: false,
          };
          setUser(loggedInUser);
          await databaseService.setCurrentUser(loggedInUser);
          const updatedAccounts = await databaseService.getRegisteredUsers();
          setSavedAccounts(updatedAccounts);
          setCloudSyncStatus('synced');
          setLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        setLoading(false);
        return { success: false, error: err.message || 'Supabase authentication failed.' };
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
        const updatedAccounts = await databaseService.getRegisteredUsers();
        setSavedAccounts(updatedAccounts);
        setCloudSyncStatus('local_only');
        setLoading(false);
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
      const updatedAccounts = await databaseService.getRegisteredUsers();
      setSavedAccounts(updatedAccounts);
      setCloudSyncStatus('local_only');
      setLoading(false);
      return { success: true };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message || 'Local login failed.' };
    }
  }, []);

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

    // 1. Try Supabase if configured
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
          setLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const newUser: UserAccount = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            username: displayName,
            createdAt: data.user.created_at || new Date().toISOString(),
            isGuest: false,
          };
          setUser(newUser);
          await databaseService.setCurrentUser(newUser);
          const updatedAccounts = await databaseService.getRegisteredUsers();
          setSavedAccounts(updatedAccounts);
          setCloudSyncStatus('synced');
          setLoading(false);
          return { success: true };
        }
      } catch (err: any) {
        setLoading(false);
        return { success: false, error: err.message || 'Supabase signup failed.' };
      }
    }

    // 2. Local-First Registration
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
      const updatedAccounts = await databaseService.getRegisteredUsers();
      setSavedAccounts(updatedAccounts);
      setCloudSyncStatus('local_only');
      setLoading(false);
      return { success: true };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message || 'Local registration failed.' };
    }
  }, []);

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
    }
  }, [signOut]);

  // Connect Supabase Cloud
  const connectSupabase = useCallback(async (url: string, anonKey: string): Promise<boolean> => {
    const success = await supabaseService.saveConfig(url, anonKey);
    if (success) {
      setCloudSyncStatus('syncing');
      const supabase = supabaseService.getClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
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
        }
      }
      return true;
    }
    return false;
  }, []);

  // Disconnect Supabase Cloud
  const disconnectSupabase = useCallback(async () => {
    await supabaseService.clearConfig();
    setCloudSyncStatus('local_only');
  }, []);

  // Trigger manual cloud sync
  const triggerSync = useCallback(async (): Promise<boolean> => {
    if (user.isGuest || !supabaseService.isConfigured()) return false;
    setCloudSyncStatus('syncing');
    const cloudData = await databaseService.syncFromCloud(user.id);
    if (cloudData) {
      setCloudSyncStatus('synced');
      return true;
    }
    setCloudSyncStatus('offline');
    return false;
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
