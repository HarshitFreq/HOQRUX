import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './api/config';

const SUPABASE_CONFIG_KEY = '@hoqrux_supabase_config_v1';

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentAnonKey: string | null = null;

// Built-in environment variables if set in .env or app config
const ENV_SUPABASE_URL = API_CONFIG.SUPABASE.URL;
const ENV_SUPABASE_ANON_KEY = API_CONFIG.SUPABASE.ANON_KEY;

/**
 * Initializes or re-initializes the Supabase client
 */
export function initSupabase(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) {
    supabaseInstance = null;
    currentUrl = null;
    currentAnonKey = null;
    return null;
  }

  try {
    currentUrl = url.trim();
    currentAnonKey = anonKey.trim();
    supabaseInstance = createClient(currentUrl, currentAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: typeof window !== 'undefined' && Boolean(window.location),
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
    supabaseInstance = null;
    return null;
  }
}

// Auto-initialize from env if available
if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
  initSupabase(ENV_SUPABASE_URL, ENV_SUPABASE_ANON_KEY);
}

export const supabaseService = {
  /**
   * Returns active Supabase client instance if configured
   */
  getClient(): SupabaseClient | null {
    return supabaseInstance;
  },

  /**
   * Whether a valid Supabase client is currently active
   */
  isConfigured(): boolean {
    return Boolean(supabaseInstance && currentUrl && currentAnonKey);
  },

  /**
   * Retrieves active or saved configuration
   */
  async getConfig(): Promise<{ url: string; anonKey: string } | null> {
    if (currentUrl && currentAnonKey) {
      return { url: currentUrl, anonKey: currentAnonKey };
    }
    try {
      const stored = await AsyncStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          initSupabase(parsed.url, parsed.anonKey);
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
      return { url: ENV_SUPABASE_URL, anonKey: ENV_SUPABASE_ANON_KEY };
    }
    return null;
  },

  /**
   * Persists custom Supabase credentials from app settings
   */
  async saveConfig(url: string, anonKey: string): Promise<boolean> {
    const client = initSupabase(url, anonKey);
    if (!client) return false;
    try {
      await AsyncStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, anonKey }));
      return true;
    } catch (e) {
      console.warn('Failed to save Supabase config:', e);
      return false;
    }
  },

  /**
   * Clears saved Supabase credentials
   */
  async clearConfig(): Promise<void> {
    supabaseInstance = null;
    currentUrl = null;
    currentAnonKey = null;
    try {
      await AsyncStorage.removeItem(SUPABASE_CONFIG_KEY);
    } catch {
      // Ignore
    }
  },
};
