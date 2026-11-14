import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserTitleTracking, Watchlist, ViewingHistoryEntry, MediaItem } from './types';

export const DEFAULT_SYSTEM_WATCHLISTS: Watchlist[] = [
  {
    id: 'list-watching',
    name: 'Watching',
    description: 'Series and films currently in active rotation',
    isCustom: false,
    accentColor: '#10B981',
    titleIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'list-watchlist',
    name: 'Want to Watch',
    description: 'Priority queue for upcoming titles to explore',
    isCustom: false,
    accentColor: '#6366F1',
    titleIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'list-completed',
    name: 'Completed',
    description: 'Finished films and completed series runs',
    isCustom: false,
    accentColor: '#F59E0B',
    titleIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const KEYS = {
  TRACKING: '@hoqrux_tracking_v1',
  WATCHLISTS: '@hoqrux_watchlists_v1',
  HISTORY: '@hoqrux_history_v1',
  TMDB_API_KEY: '@hoqrux_tmdb_key_v1',
  TVDB_API_KEY: '@hoqrux_tvdb_key_v1',
  OMDB_API_KEY: '@hoqrux_omdb_key_v1',
  TRAKT_CLIENT_ID: '@hoqrux_trakt_key_v1',
  SIMKL_CLIENT_ID: '@hoqrux_simkl_key_v1',
  WATCHMODE_API_KEY: '@hoqrux_watchmode_key_v1',
  IMDB_API_KEY: '@hoqrux_imdb_key_v1',
  MAL_CLIENT_ID: '@hoqrux_mal_key_v1',
  SETTINGS: '@hoqrux_settings_v1',
  MEDIA_CACHE: '@hoqrux_media_cache_v1',
};

export const storageService = {
  // Tracking
  async getTracking(): Promise<Record<string, UserTitleTracking>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TRACKING);
      if (data) {
        return JSON.parse(data);
      }
      return {};
    } catch {
      return {};
    }
  },

  async saveTracking(tracking: Record<string, UserTitleTracking>): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TRACKING, JSON.stringify(tracking));
    } catch (e) {
      console.error('Failed to save tracking', e);
    }
  },

  // Watchlists
  async getWatchlists(): Promise<Watchlist[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.WATCHLISTS);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(KEYS.WATCHLISTS, JSON.stringify(DEFAULT_SYSTEM_WATCHLISTS));
      return DEFAULT_SYSTEM_WATCHLISTS;
    } catch {
      return DEFAULT_SYSTEM_WATCHLISTS;
    }
  },

  async saveWatchlists(lists: Watchlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.WATCHLISTS, JSON.stringify(lists));
    } catch (e) {
      console.error('Failed to save watchlists', e);
    }
  },

  // Viewing History
  async getHistory(): Promise<ViewingHistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.HISTORY);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch {
      return [];
    }
  },

  async clearAllUserData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(KEYS.TRACKING, JSON.stringify({})),
        AsyncStorage.setItem(KEYS.WATCHLISTS, JSON.stringify(DEFAULT_SYSTEM_WATCHLISTS)),
        AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify([])),
      ]);
    } catch (e) {
      console.error('Failed to clear all user data', e);
    }
  },

  async saveHistory(history: ViewingHistoryEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  },

  // TMDB Key
  async getTmdbKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.TMDB_API_KEY);
    } catch {
      return null;
    }
  },

  async setTmdbKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TMDB_API_KEY, key);
    } catch (e) {
      console.error('Failed to save TMDB key', e);
    }
  },

  // TheTVDB Key
  async getTvdbKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.TVDB_API_KEY);
    } catch {
      return null;
    }
  },

  async setTvdbKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TVDB_API_KEY, key);
    } catch (e) {
      console.error('Failed to save TVDB key', e);
    }
  },

  // OMDb Key
  async getOmdbKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.OMDB_API_KEY);
    } catch {
      return null;
    }
  },

  async setOmdbKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.OMDB_API_KEY, key);
    } catch (e) {
      console.error('Failed to save OMDB key', e);
    }
  },

  // Trakt Client ID
  async getTraktClientId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.TRAKT_CLIENT_ID);
    } catch {
      return null;
    }
  },

  async setTraktClientId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TRAKT_CLIENT_ID, id);
    } catch (e) {
      console.error('Failed to save Trakt client ID', e);
    }
  },

  // Simkl Client ID
  async getSimklClientId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.SIMKL_CLIENT_ID);
    } catch {
      return null;
    }
  },

  async setSimklClientId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SIMKL_CLIENT_ID, id);
    } catch (e) {
      console.error('Failed to save Simkl client ID', e);
    }
  },

  // Watchmode Key
  async getWatchmodeKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.WATCHMODE_API_KEY);
    } catch {
      return null;
    }
  },

  async setWatchmodeKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.WATCHMODE_API_KEY, key);
    } catch (e) {
      console.error('Failed to save Watchmode key', e);
    }
  },

  // IMDb Key
  async getImdbKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.IMDB_API_KEY);
    } catch {
      return null;
    }
  },

  async setImdbKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.IMDB_API_KEY, key);
    } catch (e) {
      console.error('Failed to save IMDb key', e);
    }
  },

  // MyAnimeList Client ID
  async getMalClientId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.MAL_CLIENT_ID);
    } catch {
      return null;
    }
  },

  async setMalClientId(id: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.MAL_CLIENT_ID, id);
    } catch (e) {
      console.error('Failed to save MAL client ID', e);
    }
  },

  // Media Item Cache
  async getMediaCache(): Promise<Record<string, MediaItem>> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MEDIA_CACHE);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  },

  async saveMediaCache(cache: Record<string, MediaItem>): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.MEDIA_CACHE, JSON.stringify(cache));
    } catch (e) { console.error('Failed to save media cache', e); }
  },
};
