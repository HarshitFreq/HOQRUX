import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserTitleTracking, Watchlist, ViewingHistoryEntry, MediaItem } from './types';
import { DEFAULT_SYSTEM_WATCHLISTS } from './storage';
import { supabaseService } from './supabase';

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  isGuest?: boolean;
}

export const GUEST_USER: UserAccount = {
  id: 'guest',
  email: 'guest@hoqrux.local',
  username: 'GUEST',
  createdAt: new Date(0).toISOString(),
  isGuest: true,
};

const GLOBAL_KEYS = {
  CURRENT_USER: '@hoqrux_current_user_v2',
  REGISTERED_USERS: '@hoqrux_registered_users_v2',
  USER_PASSWORDS: '@hoqrux_user_creds_v2', // For local multi-account passwords
};

const LEGACY_KEYS = {
  TRACKING: '@hoqrux_tracking_v1',
  WATCHLISTS: '@hoqrux_watchlists_v1',
  HISTORY: '@hoqrux_history_v1',
  MEDIA_CACHE: '@hoqrux_media_cache_v1',
};

function getUserKey(userId: string, type: 'tracking' | 'watchlists' | 'history' | 'cache'): string {
  const safeId = (userId || 'guest').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `@hoqrux_u_${safeId}_${type}_v2`;
}

export const databaseService = {
  // ==========================================================================
  // User Session Management
  // ==========================================================================

  async getCurrentUser(): Promise<UserAccount> {
    try {
      const stored = await AsyncStorage.getItem(GLOBAL_KEYS.CURRENT_USER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Default to guest
    }
    return GUEST_USER;
  },

  async setCurrentUser(user: UserAccount): Promise<void> {
    try {
      await AsyncStorage.setItem(GLOBAL_KEYS.CURRENT_USER, JSON.stringify(user));
      if (!user.isGuest) {
        await this.saveRegisteredUser(user);
      }
    } catch (e) {
      console.error('Failed to set current user:', e);
    }
  },

  async getRegisteredUsers(): Promise<UserAccount[]> {
    try {
      const stored = await AsyncStorage.getItem(GLOBAL_KEYS.REGISTERED_USERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return [];
  },

  async saveRegisteredUser(user: UserAccount): Promise<void> {
    if (user.isGuest) return;
    try {
      const existing = await this.getRegisteredUsers();
      const filtered = existing.filter((u) => u.id !== user.id && u.email.toLowerCase() !== user.email.toLowerCase());
      filtered.unshift(user);
      await AsyncStorage.setItem(GLOBAL_KEYS.REGISTERED_USERS, JSON.stringify(filtered));
    } catch {
      // Ignore
    }
  },

  // ==========================================================================
  // User-Scoped Data Access (Offline & Instant Local-First)
  // ==========================================================================

  // Tracking
  async getUserTracking(userId: string): Promise<Record<string, UserTitleTracking>> {
    try {
      const key = getUserKey(userId, 'tracking');
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      // Auto-migrate legacy v1 tracking into guest space if present
      if (userId === 'guest') {
        const legacy = await AsyncStorage.getItem(LEGACY_KEYS.TRACKING);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (parsed && Object.keys(parsed).length > 0) {
            await AsyncStorage.setItem(key, legacy);
            return parsed;
          }
        }
      }
    } catch {
      // Fallback
    }
    return {};
  },

  async saveUserTracking(userId: string, tracking: Record<string, UserTitleTracking>): Promise<void> {
    try {
      const key = getUserKey(userId, 'tracking');
      await AsyncStorage.setItem(key, JSON.stringify(tracking));
    } catch (e) {
      console.error('Failed to save user tracking:', e);
    }
  },

  // Watchlists
  async getUserWatchlists(userId: string): Promise<Watchlist[]> {
    try {
      const key = getUserKey(userId, 'watchlists');
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      // Auto-migrate legacy v1 watchlists if present
      if (userId === 'guest') {
        const legacy = await AsyncStorage.getItem(LEGACY_KEYS.WATCHLISTS);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.some((l: any) => l.titleIds && l.titleIds.length > 0)) {
            await AsyncStorage.setItem(key, legacy);
            return parsed;
          }
        }
      }
      // Initialize with fresh system watchlists for this user
      const initLists = DEFAULT_SYSTEM_WATCHLISTS.map((list) => ({
        ...list,
        titleIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(key, JSON.stringify(initLists));
      return initLists;
    } catch {
      return DEFAULT_SYSTEM_WATCHLISTS;
    }
  },

  async saveUserWatchlists(userId: string, lists: Watchlist[]): Promise<void> {
    try {
      const key = getUserKey(userId, 'watchlists');
      await AsyncStorage.setItem(key, JSON.stringify(lists));
    } catch (e) {
      console.error('Failed to save user watchlists:', e);
    }
  },

  // History
  async getUserHistory(userId: string): Promise<ViewingHistoryEntry[]> {
    try {
      const key = getUserKey(userId, 'history');
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      if (userId === 'guest') {
        const legacy = await AsyncStorage.getItem(LEGACY_KEYS.HISTORY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await AsyncStorage.setItem(key, legacy);
            return parsed;
          }
        }
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async saveUserHistory(userId: string, history: ViewingHistoryEntry[]): Promise<void> {
    try {
      const key = getUserKey(userId, 'history');
      await AsyncStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save user history:', e);
    }
  },

  // Media Cache
  async getUserMediaCache(userId: string): Promise<Record<string, MediaItem>> {
    try {
      const key = getUserKey(userId, 'cache');
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      const legacy = await AsyncStorage.getItem(LEGACY_KEYS.MEDIA_CACHE);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && Object.keys(parsed).length > 0) {
          await AsyncStorage.setItem(key, legacy);
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return {};
  },

  async saveUserMediaCache(userId: string, cache: Record<string, MediaItem>): Promise<void> {
    try {
      const key = getUserKey(userId, 'cache');
      await AsyncStorage.setItem(key, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to save user media cache:', e);
    }
  },

  // Clear specific user's active tracking data
  async clearUserData(userId: string): Promise<void> {
    try {
      const trackingKey = getUserKey(userId, 'tracking');
      const listsKey = getUserKey(userId, 'watchlists');
      const historyKey = getUserKey(userId, 'history');
      const initLists = DEFAULT_SYSTEM_WATCHLISTS.map((list) => ({
        ...list,
        titleIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await Promise.all([
        AsyncStorage.setItem(trackingKey, JSON.stringify({})),
        AsyncStorage.setItem(listsKey, JSON.stringify(initLists)),
        AsyncStorage.setItem(historyKey, JSON.stringify([])),
      ]);
    } catch (e) {
      console.error('Failed to clear user data:', e);
    }
  },

  // ==========================================================================
  // Cloud Database Synchronization (Supabase PostgreSQL + RLS)
  // ==========================================================================

  /**
   * Pulls user's tracking, watchlists, and history from Supabase cloud database
   */
  async syncFromCloud(userId: string): Promise<{
    tracking?: Record<string, UserTitleTracking>;
    watchlists?: Watchlist[];
    history?: ViewingHistoryEntry[];
  } | null> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') {
      return null;
    }

    try {
      const [trackingRes, listsRes, historyRes] = await Promise.all([
        supabase.from('user_tracking').select('title_id, status, rating, is_favorite, reminder_set, data'),
        supabase.from('user_watchlists').select('list_id, data'),
        supabase.from('user_history').select('history_id, title_id, data, watched_at').order('watched_at', { ascending: false }),
      ]);

      const result: {
        tracking?: Record<string, UserTitleTracking>;
        watchlists?: Watchlist[];
        history?: ViewingHistoryEntry[];
      } = {};

      if (trackingRes.data && trackingRes.data.length > 0) {
        const trackingMap: Record<string, UserTitleTracking> = {};
        for (const row of trackingRes.data) {
          trackingMap[row.title_id] = {
            ...(row.data || {}),
            titleId: row.title_id,
            status: row.status,
            rating: row.rating,
            favorite: Boolean(row.is_favorite),
            reminderEnabled: Boolean(row.reminder_set),
          };
        }
        result.tracking = trackingMap;
        await this.saveUserTracking(userId, trackingMap);
      }

      if (listsRes.data && listsRes.data.length > 0) {
        const lists = listsRes.data.map((r) => r.data as Watchlist).filter(Boolean);
        result.watchlists = lists;
        await this.saveUserWatchlists(userId, lists);
      }

      if (historyRes.data && historyRes.data.length > 0) {
        const historyEntries = historyRes.data.map((r) => ({
          ...(r.data || {}),
          id: r.history_id,
          titleId: r.title_id,
          watchedAt: r.watched_at,
        })) as ViewingHistoryEntry[];
        result.history = historyEntries;
        await this.saveUserHistory(userId, historyEntries);
      }

      return result;
    } catch (err) {
      console.warn('[Cloud Database] Failed to pull user data:', err);
      return null;
    }
  },

  /**
   * Pushes a single title's tracking record to Supabase
   */
  async pushTitleTrackingToCloud(userId: string, titleId: string, track: UserTitleTracking): Promise<void> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return;

    try {
      await supabase.from('user_tracking').upsert({
        user_id: userId,
        title_id: titleId,
        status: track.status,
        rating: track.rating || null,
        is_favorite: Boolean(track.favorite),
        reminder_set: Boolean(track.reminderEnabled),
        data: track,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Offline fallback: will sync on next full sync
    }
  },

  /**
   * Pushes a watchlist to Supabase
   */
  async pushWatchlistToCloud(userId: string, list: Watchlist): Promise<void> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return;

    try {
      await supabase.from('user_watchlists').upsert({
        user_id: userId,
        list_id: list.id,
        name: list.name,
        is_custom: list.isCustom,
        accent_color: list.accentColor || null,
        data: list,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Offline fallback
    }
  },

  /**
   * Pushes a viewing history log entry to Supabase
   */
  async pushHistoryEntryToCloud(userId: string, entry: ViewingHistoryEntry): Promise<void> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return;

    try {
      await supabase.from('user_history').upsert({
        user_id: userId,
        history_id: entry.id,
        title_id: entry.titleId,
        data: entry,
        watched_at: entry.watchedAt,
      });
    } catch {
      // Offline fallback
    }
  },

  /**
   * Pushes all local user data to cloud in a single bulk operation
   */
  async pushAllToCloud(
    userId: string,
    tracking: Record<string, UserTitleTracking>,
    watchlists: Watchlist[],
    history: ViewingHistoryEntry[]
  ): Promise<boolean> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return false;

    try {
      // Upsert tracking
      const trackingRows = Object.values(tracking).map((t) => ({
        user_id: userId,
        title_id: t.titleId,
        status: t.status,
        rating: t.rating || null,
        is_favorite: Boolean(t.favorite),
        reminder_set: Boolean(t.reminderEnabled),
        data: t,
        updated_at: new Date().toISOString(),
      }));

      // Upsert watchlists
      const watchlistRows = watchlists.map((l) => ({
        user_id: userId,
        list_id: l.id,
        name: l.name,
        is_custom: l.isCustom,
        accent_color: l.accentColor || null,
        data: l,
        updated_at: new Date().toISOString(),
      }));

      // Upsert history
      const historyRows = history.map((h) => ({
        user_id: userId,
        history_id: h.id,
        title_id: h.titleId,
        data: h,
        watched_at: h.watchedAt,
      }));

      await Promise.all([
        trackingRows.length > 0 ? supabase.from('user_tracking').upsert(trackingRows) : Promise.resolve(),
        watchlistRows.length > 0 ? supabase.from('user_watchlists').upsert(watchlistRows) : Promise.resolve(),
        historyRows.length > 0 ? supabase.from('user_history').upsert(historyRows) : Promise.resolve(),
      ]);

      return true;
    } catch (err) {
      console.warn('[Cloud Database] Bulk sync failed:', err);
      return false;
    }
  },
};
