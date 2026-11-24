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
  USER_PASSWORDS: '@hoqrux_user_creds_v2',
};

const LEGACY_KEYS = {
  TRACKING: '@hoqrux_tracking_v1',
  WATCHLISTS: '@hoqrux_watchlists_v1',
  HISTORY: '@hoqrux_history_v1',
  MEDIA_CACHE: '@hoqrux_media_cache_v1',
};

// Tracks whether the remote Supabase schema has been updated to accept TEXT user IDs
let isCloudSchemaCompatible: boolean | null = null;

/**
 * Ensures user IDs sent to Supabase are always valid UUID-compliant strings,
 * allowing compatibility with both standard UUID columns and TEXT columns.
 */
export function toCloudUserId(userId: string): string {
  if (!userId || userId === 'guest') return userId;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(userId)) return userId;

  let h1 = 0xdeadbeef ^ 0x12345678;
  let h2 = 0x41c6ce57 ^ 0x87654321;
  let h3 = 0x9e3779b9;
  let h4 = 0x7feb352d;
  for (let i = 0; i < userId.length; i++) {
    const ch = userId.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const s1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const s2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const s3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const s4 = (h4 >>> 0).toString(16).padStart(8, '0');

  const fullHex = s1 + s2 + s3 + s4;
  return [
    fullHex.slice(0, 8),
    fullHex.slice(8, 12),
    '4' + fullHex.slice(13, 16),
    '8' + fullHex.slice(17, 20),
    fullHex.slice(20, 32),
  ].join('-');
}

function getUserKey(userId: string, type: 'tracking' | 'watchlists' | 'history' | 'cache'): string {
  const safeId = (userId || 'guest').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `@hoqrux_u_${safeId}_${type}_v2`;
}

function formatDbError(err: any): string {
  if (!err) return 'Unknown error';
  const msg = typeof err === 'string' ? err : err.message || '';
  const code = err.code || '';
  if (code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('security policy')) {
    return 'Cloud database security policy prevented sync. Please run the updated SQL script in your Supabase SQL Editor.';
  }
  if (code === '22P02' || msg.toLowerCase().includes('invalid input syntax for type uuid')) {
    return 'Cloud database requires TEXT user IDs. Please run the updated SQL script in your Supabase SQL Editor.';
  }
  return msg;
}

/**
 * Strips heavy nested fields (cast, seasons, episodes, similar) before persisting to local storage.
 * Keeps records under ~350 bytes rather than 50KB+, preventing SQLite storage exhaustion.
 */
export function toLightweightMediaItem(item: MediaItem): MediaItem {
  if (!item) return item;
  return {
    id: item.id,
    tmdbId: item.tmdbId,
    imdbId: item.imdbId,
    title: item.title,
    originalTitle: item.originalTitle,
    type: item.type,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    overview: item.overview ? item.overview.slice(0, 200) : '',
    releaseYear: item.releaseYear,
    tmdbRating: item.tmdbRating,
    imdbRating: item.imdbRating,
    genres: Array.isArray(item.genres) ? item.genres.slice(0, 4) : [],
    runtime: item.runtime,
    totalEpisodes: item.totalEpisodes,
    sourceProvider: item.sourceProvider,
  };
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

  async deleteUserData(userId: string): Promise<void> {
    try {
      // 1. Delete user-scoped keys
      await AsyncStorage.multiRemove([
        getUserKey(userId, 'tracking'),
        getUserKey(userId, 'watchlists'),
        getUserKey(userId, 'history'),
        getUserKey(userId, 'cache'),
      ]);

      // 2. Remove from registered users list
      const existing = await this.getRegisteredUsers();
      const filtered = existing.filter((u) => u.id !== userId);
      await AsyncStorage.setItem(GLOBAL_KEYS.REGISTERED_USERS, JSON.stringify(filtered));

      // 3. Delete from Supabase cloud if connected and user is not guest
      const supabase = supabaseService.getClient();
      if (supabase && userId !== 'guest') {
        try {
          await supabase.from('user_tracking').delete().eq('user_id', userId);
        } catch (e) {
          console.warn('[Database] Cloud delete error:', e);
        }
      }
    } catch (e) {
      console.error('[Database] Failed to delete user data:', e);
    }
  },

  // ==========================================================================
  // User Data Migration (Guest -> Registered Account)
  // ==========================================================================

  async migrateGuestDataToUser(targetUserId: string): Promise<void> {
    if (!targetUserId || targetUserId === 'guest') return;
    try {
      const [guestTracking, targetTracking] = await Promise.all([
        this.getUserTracking('guest'),
        this.getUserTracking(targetUserId),
      ]);

      // If target user has 0 tracking items, import from guest
      if (Object.keys(targetTracking).length === 0 && Object.keys(guestTracking).length > 0) {
        await this.saveUserTracking(targetUserId, guestTracking);
      }

      // If target user has empty watchlists, import from guest
      const [guestLists, targetLists] = await Promise.all([
        this.getUserWatchlists('guest'),
        this.getUserWatchlists(targetUserId),
      ]);
      const targetHasContent = targetLists.some((l) => l.titleIds && l.titleIds.length > 0);
      const guestHasContent = guestLists.some((l) => l.titleIds && l.titleIds.length > 0);
      if (!targetHasContent && guestHasContent) {
        await this.saveUserWatchlists(targetUserId, guestLists);
      }

      // If target user has no history, import from guest
      const [guestHist, targetHist] = await Promise.all([
        this.getUserHistory('guest'),
        this.getUserHistory(targetUserId),
      ]);
      if (targetHist.length === 0 && guestHist.length > 0) {
        await this.saveUserHistory(targetUserId, guestHist);
      }
    } catch (e) {
      console.warn('[Database] Guest data migration warning:', e);
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
      const sanitized: Record<string, UserTitleTracking> = {};
      for (const [tId, record] of Object.entries(tracking)) {
        if (record.cachedMediaItem) {
          sanitized[tId] = {
            ...record,
            cachedMediaItem: toLightweightMediaItem(record.cachedMediaItem),
          };
        } else {
          sanitized[tId] = record;
        }
      }
      await AsyncStorage.setItem(key, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('[database] Failed to save user tracking to local storage:', e);
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
      const entries = Object.entries(cache);
      // Retain at most 60 recent entries and keep each lightweight
      const trimmed = entries.slice(-60);
      const sanitized: Record<string, MediaItem> = {};
      for (const [k, it] of trimmed) {
        sanitized[k] = toLightweightMediaItem(it);
      }
      try {
        await AsyncStorage.setItem(key, JSON.stringify(sanitized));
      } catch {
        // If storage is constrained, prune aggressively to 20 entries
        const emergencyPruned: Record<string, MediaItem> = {};
        for (const [k, it] of entries.slice(-20)) {
          emergencyPruned[k] = toLightweightMediaItem(it);
        }
        await AsyncStorage.setItem(key, JSON.stringify(emergencyPruned));
      }
    } catch (e) {
      console.warn('[database] Gracefully skipped media cache write due to local storage limits:', e);
    }
  },

  async purgeBloatedCaches(userId?: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(LEGACY_KEYS.MEDIA_CACHE);
      if (userId) {
        const key = getUserKey(userId, 'cache');
        const data = await AsyncStorage.getItem(key);
        if (data && data.length > 250000) { // >250KB
          await AsyncStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore
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
    if (!supabase || !userId || userId === 'guest' || isCloudSchemaCompatible === false) {
      return null;
    }

    const cloudUserId = toCloudUserId(userId);

    try {
      const [trackingRes, listsRes, historyRes] = await Promise.all([
        supabase
          .from('user_tracking')
          .select('title_id, status, rating, is_favorite, reminder_set, data, updated_at')
          .eq('user_id', cloudUserId),
        supabase
          .from('user_watchlists')
          .select('list_id, name, is_custom, accent_color, data, updated_at')
          .eq('user_id', cloudUserId),
        supabase
          .from('user_history')
          .select('history_id, title_id, data, watched_at')
          .eq('user_id', cloudUserId)
          .order('watched_at', { ascending: false }),
      ]);

      const isUuidError = (err: any) => err?.code === '22P02' || (err?.message || '').includes('uuid');
      if (isUuidError(trackingRes.error) || isUuidError(listsRes.error) || isUuidError(historyRes.error)) {
        isCloudSchemaCompatible = false;
        console.warn('[Cloud Database] Supabase table schema uses UUID user_id. Please execute schema.sql in Supabase SQL editor for cloud sync.');
        return null;
      }

      if (trackingRes.error) {
        console.warn('[Cloud Database] tracking query error:', trackingRes.error);
      }
      if (listsRes.error) {
        console.warn('[Cloud Database] watchlists query error:', listsRes.error);
      }
      if (historyRes.error) {
        console.warn('[Cloud Database] history query error:', historyRes.error);
      }

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
            updatedAt: row.updated_at || row.data?.updatedAt || new Date().toISOString(),
          };
        }
        result.tracking = trackingMap;
      }

      if (listsRes.data && listsRes.data.length > 0) {
        const lists = listsRes.data.map((r) => (r.data || r) as Watchlist).filter(Boolean);
        result.watchlists = lists;
      }

      if (historyRes.data && historyRes.data.length > 0) {
        const historyEntries = historyRes.data.map((r) => ({
          ...(r.data || {}),
          id: r.history_id,
          titleId: r.title_id,
          watchedAt: r.watched_at,
        })) as ViewingHistoryEntry[];
        result.history = historyEntries;
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
  async pushTitleTrackingToCloud(
    userId: string,
    titleId: string,
    track: UserTitleTracking
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest' || isCloudSchemaCompatible === false) {
      return { success: false, error: 'Offline or guest user' };
    }

    const cloudUserId = toCloudUserId(userId);

    try {
      const { error } = await supabase.from('user_tracking').upsert({
        user_id: cloudUserId,
        title_id: titleId,
        status: track.status,
        rating: track.rating || null,
        is_favorite: Boolean(track.favorite),
        reminder_set: Boolean(track.reminderEnabled),
        data: track,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === '22P02' || error.message?.includes('uuid')) {
          isCloudSchemaCompatible = false;
        }
        console.warn(`[Cloud Database] pushTitleTracking failed for ${titleId}:`, error);
        return { success: false, error: formatDbError(error) };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Cloud Database] pushTitleTracking error:', err);
      return { success: false, error: formatDbError(err) };
    }
  },

  /**
   * Pushes a watchlist to Supabase
   */
  async pushWatchlistToCloud(userId: string, list: Watchlist): Promise<{ success: boolean; error?: string }> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest' || isCloudSchemaCompatible === false) {
      return { success: false, error: 'Offline or guest user' };
    }

    const cloudUserId = toCloudUserId(userId);

    try {
      const { error } = await supabase.from('user_watchlists').upsert({
        user_id: cloudUserId,
        list_id: list.id,
        name: list.name,
        is_custom: list.isCustom,
        accent_color: list.accentColor || null,
        data: list,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === '22P02' || error.message?.includes('uuid')) {
          isCloudSchemaCompatible = false;
        }
        console.warn(`[Cloud Database] pushWatchlist failed for ${list.id}:`, error);
        return { success: false, error: formatDbError(error) };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatDbError(err) };
    }
  },

  /**
   * Pushes a viewing history log entry to Supabase
   */
  async pushHistoryEntryToCloud(
    userId: string,
    entry: ViewingHistoryEntry
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest' || isCloudSchemaCompatible === false) {
      return { success: false, error: 'Offline or guest user' };
    }

    const cloudUserId = toCloudUserId(userId);

    try {
      const { error } = await supabase.from('user_history').upsert({
        user_id: cloudUserId,
        history_id: entry.id,
        title_id: entry.titleId,
        data: entry,
        watched_at: entry.watchedAt,
      });

      if (error) {
        if (error.code === '22P02' || error.message?.includes('uuid')) {
          isCloudSchemaCompatible = false;
        }
        console.warn(`[Cloud Database] pushHistoryEntry failed for ${entry.id}:`, error);
        return { success: false, error: formatDbError(error) };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatDbError(err) };
    }
  },

  /**
   * Deletes a specific viewing history entry from Supabase
   */
  async deleteHistoryEntryFromCloud(userId: string, historyId: string): Promise<boolean> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return false;
    const cloudUserId = toCloudUserId(userId);
    try {
      await supabase
        .from('user_history')
        .delete()
        .eq('user_id', cloudUserId)
        .eq('history_id', historyId);
      return true;
    } catch (err) {
      console.warn(`[Cloud Database] deleteHistoryEntry failed:`, err);
      return false;
    }
  },

  /**
   * Clears all history entries for a user from Supabase
   */
  async clearHistoryFromCloud(userId: string): Promise<boolean> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return false;
    const cloudUserId = toCloudUserId(userId);
    try {
      await supabase
        .from('user_history')
        .delete()
        .eq('user_id', cloudUserId);
      return true;
    } catch (err) {
      console.warn(`[Cloud Database] clearHistory failed:`, err);
      return false;
    }
  },

  /**
   * Deletes a tracking record from Supabase
   */
  async deleteTitleTrackingFromCloud(userId: string, titleId: string): Promise<boolean> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return false;
    const cloudUserId = toCloudUserId(userId);
    try {
      await supabase
        .from('user_tracking')
        .delete()
        .eq('user_id', cloudUserId)
        .eq('title_id', titleId);
      return true;
    } catch (err) {
      console.warn(`[Cloud Database] deleteTitleTracking failed:`, err);
      return false;
    }
  },

  /**
   * Deletes a watchlist from Supabase
   */
  async deleteWatchlistFromCloud(userId: string, listId: string): Promise<boolean> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest') return false;
    const cloudUserId = toCloudUserId(userId);
    try {
      await supabase
        .from('user_watchlists')
        .delete()
        .eq('user_id', cloudUserId)
        .eq('list_id', listId);
      return true;
    } catch (err) {
      console.warn(`[Cloud Database] deleteWatchlist failed:`, err);
      return false;
    }
  },

  /**
   * Pushes all local user data to cloud in bulk
   */
  async pushAllToCloud(
    userId: string,
    tracking: Record<string, UserTitleTracking>,
    watchlists: Watchlist[],
    history: ViewingHistoryEntry[],
    userProfile?: { email?: string; username?: string }
  ): Promise<{
    success: boolean;
    error?: string;
    counts?: { tracking: number; watchlists: number; history: number };
  }> {
    const supabase = supabaseService.getClient();
    if (!supabase || !userId || userId === 'guest' || isCloudSchemaCompatible === false) {
      return { success: false, error: 'Offline or guest user' };
    }

    const cloudUserId = toCloudUserId(userId);

    try {
      // 1. Prepare tracking rows
      const trackingRows = Object.values(tracking).map((t) => ({
        user_id: cloudUserId,
        title_id: t.titleId,
        status: t.status,
        rating: t.rating || null,
        is_favorite: Boolean(t.favorite),
        reminder_set: Boolean(t.reminderEnabled),
        data: t,
        updated_at: new Date().toISOString(),
      }));

      // 2. Prepare watchlist rows
      const watchlistRows = watchlists.map((l) => ({
        user_id: cloudUserId,
        list_id: l.id,
        name: l.name,
        is_custom: l.isCustom,
        accent_color: l.accentColor || null,
        data: l,
        updated_at: new Date().toISOString(),
      }));

      // 3. Prepare history rows
      const historyRows = history.map((h) => ({
        user_id: cloudUserId,
        history_id: h.id,
        title_id: h.titleId,
        data: h,
        watched_at: h.watchedAt,
      }));

      // 4. Prepare profile row
      const profileRow = {
        id: cloudUserId,
        email: userProfile?.email || `${userId}@hoqrux.app`,
        username: userProfile?.username || userId,
        updated_at: new Date().toISOString(),
      };

      const [trackingRes, listsRes, historyRes, profileRes] = await Promise.all([
        trackingRows.length > 0
          ? supabase.from('user_tracking').upsert(trackingRows)
          : Promise.resolve({ error: null }),
        watchlistRows.length > 0
          ? supabase.from('user_watchlists').upsert(watchlistRows)
          : Promise.resolve({ error: null }),
        historyRows.length > 0
          ? supabase.from('user_history').upsert(historyRows)
          : Promise.resolve({ error: null }),
        supabase.from('profiles').upsert(profileRow),
      ]);

      const error = trackingRes.error || listsRes.error || historyRes.error || profileRes.error;
      if (error) {
        if (error.code === '22P02' || error.message?.includes('uuid')) {
          isCloudSchemaCompatible = false;
        }
        console.warn('[Cloud Database] Bulk upsert error:', error);
        return { success: false, error: formatDbError(error) };
      }

      return {
        success: true,
        counts: {
          tracking: trackingRows.length,
          watchlists: watchlistRows.length,
          history: historyRows.length,
        },
      };
    } catch (err: any) {
      console.warn('[Cloud Database] Bulk sync exception:', err);
      return { success: false, error: formatDbError(err) };
    }
  },

  /**
   * Complete Bidirectional Sync: Merges cloud and local storage seamlessly
   */
  async fullCloudSync(user: UserAccount): Promise<{
    success: boolean;
    error?: string;
    trackingCount?: number;
    watchlistsCount?: number;
    historyCount?: number;
  }> {
    const supabase = supabaseService.getClient();
    if (!supabase || !user || user.isGuest) {
      return { success: false, error: 'Supabase not connected or guest account.' };
    }

    try {
      // 1. Fetch current local state
      let activeTracking = await this.getUserTracking(user.id);
      let activeWatchlists = await this.getUserWatchlists(user.id);
      let activeHistory = await this.getUserHistory(user.id);

      // Guard: If registered user account has 0 items, check if guest has items to migrate
      if (Object.keys(activeTracking).length === 0) {
        const guestTracking = await this.getUserTracking('guest');
        if (Object.keys(guestTracking).length > 0) {
          activeTracking = { ...guestTracking };
          await this.saveUserTracking(user.id, activeTracking);
        }
      }

      const hasListItems = activeWatchlists.some((l) => l.titleIds && l.titleIds.length > 0);
      if (!hasListItems) {
        const guestLists = await this.getUserWatchlists('guest');
        if (guestLists.some((l) => l.titleIds && l.titleIds.length > 0)) {
          activeWatchlists = guestLists;
          await this.saveUserWatchlists(user.id, activeWatchlists);
        }
      }

      if (activeHistory.length === 0) {
        const guestHistory = await this.getUserHistory('guest');
        if (guestHistory.length > 0) {
          activeHistory = guestHistory;
          await this.saveUserHistory(user.id, activeHistory);
        }
      }

      // 2. Fetch remote records from Supabase
      const remote = await this.syncFromCloud(user.id);

      // 3. Merge remote into local
      if (remote?.tracking && Object.keys(remote.tracking).length > 0) {
        for (const [tId, rTrack] of Object.entries(remote.tracking)) {
          if (!activeTracking[tId]) {
            activeTracking[tId] = rTrack;
          } else {
            const rTime = rTrack.updatedAt ? new Date(rTrack.updatedAt).getTime() : 0;
            const lTime = activeTracking[tId].updatedAt ? new Date(activeTracking[tId].updatedAt).getTime() : 0;
            if (rTime > lTime) {
              activeTracking[tId] = rTrack;
            }
          }
        }
        await this.saveUserTracking(user.id, activeTracking);
      }

      if (remote?.watchlists && remote.watchlists.length > 0) {
        const localListMap = new Map(activeWatchlists.map((l) => [l.id, l]));
        for (const rList of remote.watchlists) {
          if (!localListMap.has(rList.id)) {
            activeWatchlists.push(rList);
          } else {
            const localL = localListMap.get(rList.id)!;
            const mergedIds = Array.from(new Set([...(localL.titleIds || []), ...(rList.titleIds || [])]));
            localL.titleIds = mergedIds;
          }
        }
        await this.saveUserWatchlists(user.id, activeWatchlists);
      }

      if (remote?.history && remote.history.length > 0) {
        const existingIds = new Set(activeHistory.map((h) => h.id));
        for (const rHist of remote.history) {
          if (!existingIds.has(rHist.id)) {
            activeHistory.push(rHist);
          }
        }
        activeHistory.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
        await this.saveUserHistory(user.id, activeHistory);
      }

      // 4. Push merged complete dataset to Supabase PostgreSQL
      const pushRes = await this.pushAllToCloud(
        user.id,
        activeTracking,
        activeWatchlists,
        activeHistory,
        {
          email: user.email,
          username: user.username,
        }
      );

      if (!pushRes.success) {
        return { success: false, error: pushRes.error };
      }

      return {
        success: true,
        trackingCount: Object.keys(activeTracking).length,
        watchlistsCount: activeWatchlists.length,
        historyCount: activeHistory.length,
      };
    } catch (e: any) {
      console.error('[Cloud Database] fullCloudSync exception:', e);
      return { success: false, error: e?.message || 'Sync failed' };
    }
  },
};
