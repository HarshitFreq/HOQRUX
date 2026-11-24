import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  MediaItem,
  UserTitleTracking,
  Watchlist,
  ViewingHistoryEntry,
  WatchStatus,
  UserStats,
} from '../services/types';
import { DEFAULT_SYSTEM_WATCHLISTS } from '../services/storage';
import { databaseService, toLightweightMediaItem } from '../services/database';
import { useAuth } from './AuthContext';
import { INITIAL_MEDIA_ITEMS } from '../services/mockData';
import { tmdbService } from '../services/tmdb';

interface TrackingContextType {
  tracking: Record<string, UserTitleTracking>;
  watchlists: Watchlist[];
  history: ViewingHistoryEntry[];
  stats: UserStats;
  loading: boolean;
  mediaCache: Record<string, MediaItem>;
  resolveMediaItem: (titleId: string) => MediaItem | undefined;
  cacheMediaItem: (item: MediaItem) => Promise<void>;
  refreshTracking: () => Promise<void>;
  logMediaWatched: (mediaItem: MediaItem, rating?: number) => Promise<void>;
  clearAllActivity: () => Promise<void>;
  
  // Episode Tracking
  toggleEpisodeWatched: (
    mediaItem: MediaItem,
    seasonNumber: number,
    episodeNumber: number,
    episodeTitle?: string,
    runtime?: number
  ) => Promise<void>;
  markSeasonWatched: (
    mediaItem: MediaItem,
    seasonNumber: number,
    watched: boolean
  ) => Promise<void>;
  markEpisodesUpTo: (
    mediaItem: MediaItem,
    seasonNumber: number,
    upToEpisodeNumber: number,
    includePriorSeasons?: boolean
  ) => Promise<void>;
  
  // Status & Details
  setWatchStatus: (mediaItem: MediaItem, status: WatchStatus) => Promise<void>;
  setRating: (titleId: string, rating: number) => Promise<void>;
  setReview: (titleId: string, review: string) => Promise<void>;
  toggleFavorite: (titleId: string) => Promise<void>;
  toggleReminder: (titleId: string) => Promise<void>;
  incrementRewatch: (titleId: string) => Promise<void>;
  
  // Watchlist Management
  createWatchlist: (name: string, description: string, accentColor?: string) => Promise<Watchlist>;
  deleteWatchlist: (listId: string) => Promise<void>;
  toggleTitleInWatchlist: (listId: string, titleId: string, mediaItem?: MediaItem) => Promise<void>;
  
  // History & Query helpers
  clearHistory: () => Promise<void>;
  removeHistoryItem: (historyId: string) => Promise<void>;
  getTrackingForTitle: (titleId: string) => UserTitleTracking | undefined;
  getEpisodeProgress: (titleId: string, seasonNum: number, epNum: number) => boolean;
  getShowProgress: (mediaItem: MediaItem) => {
    watchedCount: number;
    totalCount: number;
    percentage: number;
    label: string;
  };
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

function updateSystemWatchlistsForStatus(
  prevLists: Watchlist[],
  titleId: string,
  status: WatchStatus
): Watchlist[] {
  const listMap: Record<WatchStatus, string> = {
    watching: 'list-watching',
    plan_to_watch: 'list-watchlist',
    completed: 'list-completed',
    dropped: '',
  };
  const targetListId = listMap[status];

  return prevLists.map((list) => {
    // Only synchronize the 3 core system lists; custom user lists remain intact
    if (list.id === 'list-watching' || list.id === 'list-watchlist' || list.id === 'list-completed') {
      const filtered = list.titleIds.filter((id) => id !== titleId);
      if (list.id === targetListId) {
        return {
          ...list,
          titleIds: [titleId, ...filtered],
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...list,
        titleIds: filtered,
        updatedAt: new Date().toISOString(),
      };
    }
    return list;
  });
}

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user.id;

  const [tracking, setTracking] = useState<Record<string, UserTitleTracking>>({});
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [history, setHistory] = useState<ViewingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaCache, setMediaCache] = useState<Record<string, MediaItem>>({});

  // Helper persistence functions bound to the active user's isolated database space
  const persistTracking = useCallback(async (nextTracking: Record<string, UserTitleTracking>, titleId?: string) => {
    await databaseService.saveUserTracking(userId, nextTracking);
    if (!user.isGuest) {
      if (titleId && nextTracking[titleId]) {
        databaseService.pushTitleTrackingToCloud(userId, titleId, nextTracking[titleId]).catch((err) => {
          console.warn('[TrackingContext] Background title tracking push error:', err);
        });
      } else {
        databaseService.pushAllToCloud(userId, nextTracking, watchlists, history, {
          email: user.email,
          username: user.username,
        }).catch(() => {});
      }
    }
  }, [userId, user.isGuest, watchlists, history, user.email, user.username]);

  const persistWatchlists = useCallback(async (nextLists: Watchlist[]) => {
    await databaseService.saveUserWatchlists(userId, nextLists);
    if (!user.isGuest) {
      databaseService.pushAllToCloud(userId, tracking, nextLists, history, {
        email: user.email,
        username: user.username,
      }).catch((err) => {
        console.warn('[TrackingContext] Background watchlists push error:', err);
      });
    }
  }, [userId, user.isGuest, tracking, history, user.email, user.username]);

  const persistHistory = useCallback(async (nextHistory: ViewingHistoryEntry[], deletedHistoryId?: string) => {
    await databaseService.saveUserHistory(userId, nextHistory);
    if (!user.isGuest) {
      if (deletedHistoryId) {
        databaseService.deleteHistoryEntryFromCloud(userId, deletedHistoryId).catch(() => {});
      } else if (nextHistory.length === 0) {
        databaseService.clearHistoryFromCloud(userId).catch(() => {});
      } else if (nextHistory[0]) {
        databaseService.pushHistoryEntryToCloud(userId, nextHistory[0]).catch(() => {});
      }
    }
  }, [userId, user.isGuest]);

  const persistCache = useCallback(async (nextCache: Record<string, MediaItem>) => {
    await databaseService.saveUserMediaCache(userId, nextCache);
  }, [userId]);

  // Load active user's data whenever user identity changes (login, logout, account switch)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        await databaseService.purgeBloatedCaches(userId);
        const [savedTracking, savedLists, savedHistory, savedMediaCache] = await Promise.all([
          databaseService.getUserTracking(userId),
          databaseService.getUserWatchlists(userId),
          databaseService.getUserHistory(userId),
          databaseService.getUserMediaCache(userId),
        ]);
        if (isMounted) {
          setTracking(savedTracking);
          setWatchlists(savedLists);
          setHistory(savedHistory);
          setMediaCache(savedMediaCache);
          setLoading(false);
        }

        // Complete bidirectional sync with Supabase cloud
        if (!user.isGuest) {
          databaseService.fullCloudSync(user).then((res) => {
            if (res.success && isMounted) {
              Promise.all([
                databaseService.getUserTracking(userId),
                databaseService.getUserWatchlists(userId),
                databaseService.getUserHistory(userId),
              ]).then(([mergedTracking, mergedLists, mergedHist]) => {
                if (isMounted) {
                  setTracking(mergedTracking);
                  setWatchlists(mergedLists);
                  setHistory(mergedHist);
                }
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to load tracking data:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const getTrackingForTitle = useCallback((titleId: string): UserTitleTracking | undefined => {
    return tracking[titleId];
  }, [tracking]);

  const getEpisodeProgress = useCallback((titleId: string, seasonNum: number, epNum: number): boolean => {
    const record = tracking[titleId];
    if (!record) return false;
    const epKey = `s${seasonNum}e${epNum}`;
    return !!record.watchedEpisodes[epKey]?.watched;
  }, [tracking]);

  const getShowProgress = useCallback((mediaItem: MediaItem) => {
    const record = tracking[mediaItem.id];
    let totalCount = mediaItem.totalEpisodes || 0;
    
    // Count from seasons if available
    if (mediaItem.seasons && mediaItem.seasons.length > 0) {
      const calculated = mediaItem.seasons.reduce((acc, s) => acc + (s.episodes?.length || s.episodeCount || 0), 0);
      if (calculated > 0) totalCount = calculated;
    }

    if (totalCount === 0) totalCount = 10; // fallback

    let watchedCount = 0;
    if (record?.watchedEpisodes) {
      watchedCount = Object.values(record.watchedEpisodes).filter(e => e.watched).length;
    }

    const percentage = Math.min(100, Math.round((watchedCount / totalCount) * 100));
    let label = `${watchedCount}/${totalCount} eps (${percentage}%)`;
    if (record?.lastWatchedSeason && record?.lastWatchedEpisode) {
      label = `S${record.lastWatchedSeason}:E${record.lastWatchedEpisode} • ${watchedCount}/${totalCount} (${percentage}%)`;
    }

    return { watchedCount, totalCount, percentage, label };
  }, [tracking]);

  const resolveMediaItem = useCallback((titleId: string): MediaItem | undefined => {
    if (!titleId) return undefined;

    // Build candidate ID keys to resolve across formats (e.g. "61459", "tv-61459", "movie-61459", "anime-61459")
    const bareId = titleId.replace(/^(tv|movie|anime)-/, '');
    const candidateIds = [
      titleId,
      bareId,
      `tv-${bareId}`,
      `movie-${bareId}`,
      `anime-${bareId}`,
    ];

    // 1. Check in-memory mediaCache by any candidate ID
    for (const cid of candidateIds) {
      if (mediaCache[cid]) return mediaCache[cid];
    }

    // 2. Check tracking records for cachedMediaItem
    for (const cid of candidateIds) {
      const tr = tracking[cid];
      if (tr?.cachedMediaItem) return tr.cachedMediaItem;
    }

    // 3. Check INITIAL_MEDIA_ITEMS
    for (const cid of candidateIds) {
      const initial = INITIAL_MEDIA_ITEMS.find((m) => m.id === cid || String(m.tmdbId) === bareId);
      if (initial) return initial;
    }

    // 4. Check tmdbService runtimeMediaCache
    for (const cid of candidateIds) {
      const tmdbCached = tmdbService.getCachedItem(cid);
      if (tmdbCached) return tmdbCached;
    }

    // 5. Check history for reconstructed MediaItem so UI never drops logged items
    const hist = history.find((h) => candidateIds.includes(h.titleId));
    if (hist) {
      const numericId = parseInt(hist.titleId.replace(/\D/g, ''), 10) || 0;
      const isAnime =
        hist.mediaType === 'anime' ||
        hist.titleId.startsWith('anilist-') ||
        hist.titleId.startsWith('kitsu-') ||
        hist.titleId.startsWith('mal-') ||
        hist.titleId.startsWith('jikan-') ||
        /ghoul|naruto|titan|slayer|jujutsu|piece|bleach/i.test(hist.titleName);

      return {
        id: hist.titleId,
        tmdbId: numericId,
        title: hist.titleName,
        type: isAnime ? 'anime' : hist.mediaType,
        posterPath: hist.posterPath,
        backdropPath: hist.posterPath,
        overview: '',
        genres: isAnime
          ? ['Anime', 'Animation', 'Action']
          : hist.mediaType === 'tv'
          ? ['Drama', 'Series']
          : ['Cinema', 'Feature Film'],
        releaseYear: new Date(hist.watchedAt).getFullYear() || 2024,
        tmdbRating: 8.0,
      };
    }
    return undefined;
  }, [mediaCache, history, tracking]);

  const cacheMediaItem = useCallback(async (item: MediaItem) => {
    if (!item?.id) return;
    const bareId = item.id.replace(/^(tv|movie|anime)-/, '');
    const light = toLightweightMediaItem(item);
    setMediaCache((prev) => {
      const keys = Object.keys(prev);
      const nextCache: Record<string, MediaItem> = {};
      const recentKeys = keys.slice(-60);
      for (const k of recentKeys) {
        nextCache[k] = prev[k];
      }
      nextCache[item.id] = light;
      nextCache[bareId] = light;
      nextCache[`${item.type}-${bareId}`] = light;
      persistCache(nextCache);
      return nextCache;
    });
    tmdbService.cacheMediaItems([light]);
  }, [persistCache]);

  const refreshTracking = useCallback(async () => {
    try {
      const [savedTracking, savedLists, savedHistory, savedMediaCache] = await Promise.all([
        databaseService.getUserTracking(userId),
        databaseService.getUserWatchlists(userId),
        databaseService.getUserHistory(userId),
        databaseService.getUserMediaCache(userId),
      ]);
      setTracking(savedTracking);
      setWatchlists(savedLists);
      setHistory(savedHistory);
      setMediaCache((prev) => ({ ...savedMediaCache, ...prev }));
    } catch (err) {
      console.error('Failed to refresh tracking data:', err);
    }
  }, [userId]);

  const logMediaWatched = useCallback(async (mediaItem: MediaItem, rating?: number) => {
    await cacheMediaItem(mediaItem);
    const nowIso = new Date().toISOString();
    const prev = tracking[mediaItem.id] || {
      titleId: mediaItem.id,
      status: 'completed' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: nowIso,
    };

    const nextRecord: UserTitleTracking = {
      ...prev,
      status: 'completed',
      rating: rating !== undefined ? rating : prev.rating,
      completedAt: nowIso,
      updatedAt: nowIso,
      cachedMediaItem: toLightweightMediaItem(mediaItem),
    };

    const nextTracking = { ...tracking, [mediaItem.id]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, mediaItem.id);

    // Sync with system watchlists: add to completed, remove from watching and want to watch
    const nextLists = updateSystemWatchlistsForStatus(watchlists, mediaItem.id, 'completed');
    setWatchlists(nextLists);
    await persistWatchlists(nextLists);

    const historyEntry: ViewingHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      titleId: mediaItem.id,
      titleName: mediaItem.title,
      mediaType: mediaItem.type === 'movie' ? 'movie' : 'tv',
      posterPath: mediaItem.posterPath,
      watchedAt: nowIso,
    };
    const nextHistory = [historyEntry, ...history];
    setHistory(nextHistory);
    await persistHistory(nextHistory);
  }, [tracking, watchlists, history, cacheMediaItem, persistTracking, persistWatchlists, persistHistory]);

  // Toggle single episode watched
  const toggleEpisodeWatched = useCallback(async (
    mediaItem: MediaItem,
    seasonNumber: number,
    episodeNumber: number,
    episodeTitle?: string,
    _runtime?: number
  ) => {
    await cacheMediaItem(mediaItem);
    const key = `s${seasonNumber}e${episodeNumber}`;
    const prev = tracking[mediaItem.id] || {
      titleId: mediaItem.id,
      status: 'watching' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };

    const isCurrentlyWatched = !!prev.watchedEpisodes[key]?.watched;
    const nextWatched = !isCurrentlyWatched;

    const updatedEpisodes = {
      ...prev.watchedEpisodes,
      [key]: {
        watched: nextWatched,
        watchedAt: new Date().toISOString(),
      },
    };

    const watchedCount = Object.values(updatedEpisodes).filter(e => e.watched).length;
    const totalCount = mediaItem.totalEpisodes || 10;
    const isNowAllWatched = watchedCount >= totalCount;
    const nextStatus: WatchStatus = isNowAllWatched ? 'completed' : 'watching';

    const nextRecord: UserTitleTracking = {
      ...prev,
      watchedEpisodes: updatedEpisodes,
      status: nextStatus,
      lastWatchedSeason: nextWatched ? seasonNumber : prev.lastWatchedSeason,
      lastWatchedEpisode: nextWatched ? episodeNumber : prev.lastWatchedEpisode,
      completedAt: isNowAllWatched ? new Date().toISOString() : prev.completedAt,
      updatedAt: new Date().toISOString(),
      cachedMediaItem: toLightweightMediaItem(mediaItem),
    };

    const nextTracking = { ...tracking, [mediaItem.id]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, mediaItem.id);

    // Sync with system watchlists
    const nextLists = updateSystemWatchlistsForStatus(watchlists, mediaItem.id, nextStatus);
    setWatchlists(nextLists);
    await persistWatchlists(nextLists);

    // Update History
    let nextHistory = [...history];
    if (nextWatched) {
      const historyEntry: ViewingHistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        titleId: mediaItem.id,
        titleName: mediaItem.title,
        mediaType: 'tv',
        posterPath: mediaItem.posterPath,
        seasonNumber,
        episodeNumber,
        episodeTitle: episodeTitle || `Episode ${episodeNumber}`,
        watchedAt: new Date().toISOString(),
      };
      nextHistory = [historyEntry, ...nextHistory];
    } else {
      nextHistory = nextHistory.filter(
        h => !(h.titleId === mediaItem.id && h.seasonNumber === seasonNumber && h.episodeNumber === episodeNumber)
      );
    }
    setHistory(nextHistory);
    await persistHistory(nextHistory);
  }, [cacheMediaItem, tracking, watchlists, history, persistTracking, persistWatchlists, persistHistory]);

  // Batch mark episodes up to a specific episode in a season (with optional prior seasons)
  const markEpisodesUpTo = useCallback(async (
    mediaItem: MediaItem,
    seasonNumber: number,
    upToEpisodeNumber: number,
    includePriorSeasons: boolean = true
  ) => {
    await cacheMediaItem(mediaItem);
    const season = mediaItem.seasons?.find((s) => s.seasonNumber === seasonNumber);
    if (!season) return;

    const prev = tracking[mediaItem.id] || {
      titleId: mediaItem.id,
      status: 'watching' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };

    const updatedEpisodes = { ...prev.watchedEpisodes };
    const nowIso = new Date().toISOString();
    const newHistoryEntries: ViewingHistoryEntry[] = [];

    // Mark prior seasons if requested (e.g. if logging S2:E4, mark S1 as completed)
    if (includePriorSeasons && mediaItem.seasons) {
      mediaItem.seasons.forEach((priorSeason) => {
        if (priorSeason.seasonNumber < seasonNumber) {
          priorSeason.episodes.forEach((ep) => {
            const epKey = `s${priorSeason.seasonNumber}e${ep.episodeNumber}`;
            if (!updatedEpisodes[epKey]?.watched) {
              updatedEpisodes[epKey] = { watched: true, watchedAt: nowIso };
              newHistoryEntries.push({
                id: `hist-${Date.now()}-${priorSeason.seasonNumber}-${ep.episodeNumber}-${Math.random().toString(36).substr(2, 4)}`,
                titleId: mediaItem.id,
                titleName: mediaItem.title,
                mediaType: 'tv',
                posterPath: mediaItem.posterPath,
                seasonNumber: priorSeason.seasonNumber,
                episodeNumber: ep.episodeNumber,
                episodeTitle: ep.title,
                watchedAt: nowIso,
              });
            }
          });
        }
      });
    }

    // Mark current season episodes up to the target episode
    season.episodes.forEach((ep) => {
      if (ep.episodeNumber <= upToEpisodeNumber) {
        const epKey = `s${seasonNumber}e${ep.episodeNumber}`;
        if (!updatedEpisodes[epKey]?.watched) {
          updatedEpisodes[epKey] = { watched: true, watchedAt: nowIso };
          newHistoryEntries.push({
            id: `hist-${Date.now()}-${seasonNumber}-${ep.episodeNumber}-${Math.random().toString(36).substr(2, 4)}`,
            titleId: mediaItem.id,
            titleName: mediaItem.title,
            mediaType: 'tv',
            posterPath: mediaItem.posterPath,
            seasonNumber,
            episodeNumber: ep.episodeNumber,
            episodeTitle: ep.title,
            watchedAt: nowIso,
          });
        }
      }
    });

    const watchedCount = Object.values(updatedEpisodes).filter((e) => e.watched).length;
    const allEpisodesCount = mediaItem.seasons
      ? mediaItem.seasons.reduce((acc, s) => acc + s.episodes.length, 0)
      : mediaItem.totalEpisodes || 10;

    const isFullyCompleted = watchedCount >= allEpisodesCount;
    const nextStatus: WatchStatus = isFullyCompleted ? 'completed' : 'watching';

    const nextRecord: UserTitleTracking = {
      ...prev,
      watchedEpisodes: updatedEpisodes,
      status: nextStatus,
      lastWatchedSeason: seasonNumber,
      lastWatchedEpisode: upToEpisodeNumber,
      completedAt: isFullyCompleted ? nowIso : prev.completedAt,
      updatedAt: nowIso,
      cachedMediaItem: toLightweightMediaItem(mediaItem),
    };

    const nextTracking = { ...tracking, [mediaItem.id]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, mediaItem.id);

    // Sync with system watchlists
    const nextLists = updateSystemWatchlistsForStatus(watchlists, mediaItem.id, nextStatus);
    setWatchlists(nextLists);
    await persistWatchlists(nextLists);

    if (newHistoryEntries.length > 0) {
      const nextHistory = [...newHistoryEntries, ...history];
      setHistory(nextHistory);
      await persistHistory(nextHistory);
    }
  }, [cacheMediaItem, tracking, watchlists, history, persistTracking, persistWatchlists, persistHistory]);

  // Bulk mark entire season
  const markSeasonWatched = useCallback(async (
    mediaItem: MediaItem,
    seasonNumber: number,
    watched: boolean
  ) => {
    await cacheMediaItem(mediaItem);
    const season = mediaItem.seasons?.find(s => s.seasonNumber === seasonNumber);
    if (!season) return;

    const prev = tracking[mediaItem.id] || {
      titleId: mediaItem.id,
      status: 'watching' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };

    const updatedEpisodes = { ...prev.watchedEpisodes };
    const nowIso = new Date().toISOString();
    const newHistoryEntries: ViewingHistoryEntry[] = [];

    season.episodes.forEach(ep => {
      const epKey = `s${seasonNumber}e${ep.episodeNumber}`;
      updatedEpisodes[epKey] = { watched, watchedAt: nowIso };
      if (watched) {
        newHistoryEntries.push({
          id: `hist-${Date.now()}-${ep.episodeNumber}-${Math.random().toString(36).substr(2, 4)}`,
          titleId: mediaItem.id,
          titleName: mediaItem.title,
          mediaType: 'tv',
          posterPath: mediaItem.posterPath,
          seasonNumber,
          episodeNumber: ep.episodeNumber,
          episodeTitle: ep.title,
          watchedAt: nowIso,
        });
      }
    });

    const watchedCount = Object.values(updatedEpisodes).filter(e => e.watched).length;
    const totalCount = mediaItem.totalEpisodes || 10;
    const isDone = watchedCount >= totalCount;
    const nextStatus: WatchStatus = isDone ? 'completed' : (watchedCount > 0 ? 'watching' : prev.status);

    const nextRecord: UserTitleTracking = {
      ...prev,
      watchedEpisodes: updatedEpisodes,
      status: nextStatus,
      lastWatchedSeason: seasonNumber,
      lastWatchedEpisode: season.episodes[season.episodes.length - 1]?.episodeNumber || 1,
      completedAt: isDone ? nowIso : prev.completedAt,
      updatedAt: nowIso,
      cachedMediaItem: toLightweightMediaItem(mediaItem),
    };

    const nextTracking = { ...tracking, [mediaItem.id]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, mediaItem.id);

    // Sync with system watchlists
    const nextLists = updateSystemWatchlistsForStatus(watchlists, mediaItem.id, nextStatus);
    setWatchlists(nextLists);
    await persistWatchlists(nextLists);

    let nextHistory = [...history];
    if (watched) {
      nextHistory = [...newHistoryEntries, ...nextHistory];
    } else {
      nextHistory = nextHistory.filter(h => !(h.titleId === mediaItem.id && h.seasonNumber === seasonNumber));
    }
    setHistory(nextHistory);
    await persistHistory(nextHistory);
  }, [cacheMediaItem, tracking, watchlists, history, persistTracking, persistWatchlists, persistHistory]);

  // Change watch status
  const setWatchStatus = useCallback(async (mediaItem: MediaItem, status: WatchStatus) => {
    await cacheMediaItem(mediaItem);
    const nowIso = new Date().toISOString();
    const prev = tracking[mediaItem.id] || {
      titleId: mediaItem.id,
      status,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: nowIso,
    };

    const nextRecord: UserTitleTracking = {
      ...prev,
      status,
      completedAt: status === 'completed' ? nowIso : prev.completedAt,
      updatedAt: nowIso,
      cachedMediaItem: toLightweightMediaItem(mediaItem),
    };

    const nextTracking = { ...tracking, [mediaItem.id]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, mediaItem.id);

    // Sync with system watchlists (Watching / Want to Watch / Completed)
    const nextLists = updateSystemWatchlistsForStatus(watchlists, mediaItem.id, status);
    setWatchlists(nextLists);
    await persistWatchlists(nextLists);

    // If marked completed, record entry in viewing history
    if (status === 'completed') {
      const historyEntry: ViewingHistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        titleId: mediaItem.id,
        titleName: mediaItem.title,
        mediaType: mediaItem.type === 'movie' ? 'movie' : 'tv',
        posterPath: mediaItem.posterPath,
        watchedAt: nowIso,
      };
      const nextHistory = [historyEntry, ...history];
      setHistory(nextHistory);
      await persistHistory(nextHistory);
    }
  }, [cacheMediaItem, tracking, watchlists, history, persistTracking, persistWatchlists, persistHistory]);

  // Set user rating
  const setRating = useCallback(async (titleId: string, rating: number) => {
    const prev = tracking[titleId] || {
      titleId,
      status: 'completed' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };

    const nextRecord = {
      ...prev,
      rating,
      updatedAt: new Date().toISOString(),
    };
    const nextTracking = { ...tracking, [titleId]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, titleId);
  }, [tracking, persistTracking]);

  // Set personal review / notes
  const setReview = useCallback(async (titleId: string, review: string) => {
    const prev = tracking[titleId] || {
      titleId,
      status: 'watching' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };
    const nextRecord = { ...prev, review, updatedAt: new Date().toISOString() };
    const nextTracking = { ...tracking, [titleId]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, titleId);
  }, [tracking, persistTracking]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (titleId: string) => {
    const prev = tracking[titleId] || {
      titleId,
      status: 'watching' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };
    const nextRecord = { ...prev, favorite: !prev.favorite, updatedAt: new Date().toISOString() };
    const nextTracking = { ...tracking, [titleId]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, titleId);
  }, [tracking, persistTracking]);

  // Toggle episode reminder
  const toggleReminder = useCallback(async (titleId: string) => {
    const prev = tracking[titleId] || {
      titleId,
      status: 'watching' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: new Date().toISOString(),
    };
    const nextRecord = { ...prev, reminderEnabled: !prev.reminderEnabled, updatedAt: new Date().toISOString() };
    const nextTracking = { ...tracking, [titleId]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, titleId);
  }, [tracking, persistTracking]);

  // Increment rewatch count
  const incrementRewatch = useCallback(async (titleId: string) => {
    const nowIso = new Date().toISOString();
    const prev = tracking[titleId] || {
      titleId,
      status: 'completed' as WatchStatus,
      rewatchCount: 0,
      favorite: false,
      watchedEpisodes: {},
      updatedAt: nowIso,
    };
    const nextRecord = { ...prev, rewatchCount: (prev.rewatchCount || 0) + 1, updatedAt: nowIso };
    const nextTracking = { ...tracking, [titleId]: nextRecord };
    setTracking(nextTracking);
    await persistTracking(nextTracking, titleId);

    const item = resolveMediaItem(titleId);
    if (item) {
      const historyEntry: ViewingHistoryEntry = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        titleId: item.id,
        titleName: item.title,
        mediaType: item.type === 'movie' ? 'movie' : 'tv',
        posterPath: item.posterPath,
        watchedAt: nowIso,
      };
      const nextHistory = [historyEntry, ...history];
      setHistory(nextHistory);
      await persistHistory(nextHistory);
    }
  }, [tracking, resolveMediaItem, history, persistTracking, persistHistory]);

  // Custom Watchlist actions
  const createWatchlist = useCallback(async (name: string, description: string, accentColor = '#10B981'): Promise<Watchlist> => {
    const newList: Watchlist = {
      id: `list-${Date.now()}`,
      name,
      description,
      isCustom: true,
      accentColor,
      titleIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...watchlists, newList];
    setWatchlists(next);
    await persistWatchlists(next);
    return newList;
  }, [watchlists, persistWatchlists]);

  const deleteWatchlist = useCallback(async (listId: string) => {
    const next = watchlists.filter(l => l.id !== listId);
    setWatchlists(next);
    await persistWatchlists(next);
  }, [watchlists, persistWatchlists]);

  const toggleTitleInWatchlist = useCallback(async (listId: string, titleId: string, mediaItem?: MediaItem) => {
    const list = watchlists.find(l => l.id === listId);
    if (!list) return;

    if (mediaItem) {
      await cacheMediaItem(mediaItem);
    }

    const exists = list.titleIds.includes(titleId);
    let targetStatus: WatchStatus | null = null;

    if (listId === 'list-watching') {
      targetStatus = exists ? 'dropped' : 'watching';
    } else if (listId === 'list-watchlist') {
      targetStatus = exists ? 'dropped' : 'plan_to_watch';
    } else if (listId === 'list-completed') {
      targetStatus = exists ? 'dropped' : 'completed';
    }

    let nextLists: Watchlist[];
    if (targetStatus) {
      nextLists = updateSystemWatchlistsForStatus(watchlists, titleId, targetStatus);
    } else {
      nextLists = watchlists.map(l => {
        if (l.id !== listId) return l;
        const titleIds = exists ? l.titleIds.filter(id => id !== titleId) : [...l.titleIds, titleId];
        return { ...l, titleIds, updatedAt: new Date().toISOString() };
      });
    }

    setWatchlists(nextLists);
    await persistWatchlists(nextLists);

    if (targetStatus) {
      const nowIso = new Date().toISOString();
      const prev = tracking[titleId] || {
        titleId,
        status: targetStatus,
        rewatchCount: 0,
        favorite: false,
        watchedEpisodes: {},
        updatedAt: nowIso,
      };
      const cachedItem = mediaItem || mediaCache[titleId] || prev.cachedMediaItem || resolveMediaItem(titleId);
      const nextTracking = {
        ...tracking,
        [titleId]: {
          ...prev,
          status: targetStatus,
          updatedAt: nowIso,
          completedAt: targetStatus === 'completed' ? nowIso : prev.completedAt,
          cachedMediaItem: cachedItem ? toLightweightMediaItem(cachedItem) : undefined,
        },
      };
      setTracking(nextTracking);
      await persistTracking(nextTracking, titleId);

      // If added to completed, record entry in viewing history
      if (targetStatus === 'completed') {
        const item = mediaItem || resolveMediaItem(titleId);
        if (item) {
          const historyEntry: ViewingHistoryEntry = {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            titleId: item.id,
            titleName: item.title,
            mediaType: item.type === 'movie' ? 'movie' : 'tv',
            posterPath: item.posterPath,
            watchedAt: nowIso,
          };
          const nextHistory = [historyEntry, ...history];
          setHistory(nextHistory);
          await persistHistory(nextHistory);
        }
      }
    }
  }, [watchlists, tracking, history, resolveMediaItem, mediaCache, cacheMediaItem, persistWatchlists, persistTracking, persistHistory]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await persistHistory([]);
  }, [persistHistory]);

  const clearAllActivity = useCallback(async () => {
    await databaseService.clearUserData(userId);
    setTracking({});
    setWatchlists(DEFAULT_SYSTEM_WATCHLISTS.map((list) => ({ ...list, titleIds: [] })));
    setHistory([]);
  }, [userId]);

  const removeHistoryItem = useCallback(async (historyId: string) => {
    const next = history.filter(h => h.id !== historyId);
    setHistory(next);
    await persistHistory(next, historyId);
  }, [history, persistHistory]);

  // Compute stats
  const stats: UserStats = useMemo(() => {
    let totalMinutes = 0;
    let totalEpisodesWatched = 0;
    let totalMoviesWatched = 0;
    const genreMap: Record<string, number> = {};
    const ratings: number[] = [];

    // Calculate from tracking & item cache
    Object.values(tracking).forEach(tr => {
      const item = resolveMediaItem(tr.titleId);
      if (tr.rating) ratings.push(tr.rating);

      if (item) {
        item.genres.forEach(g => {
          genreMap[g] = (genreMap[g] || 0) + 1;
        });

        const isEpisodic = item.type === 'tv' || (item.type === 'anime' && ((item.totalEpisodes || 0) > 1 || (item.seasons && item.seasons.length > 0)));

        if (isEpisodic) {
          const watchedEps = Object.values(tr.watchedEpisodes || {}).filter(e => e.watched).length;
          const effectiveEps = watchedEps > 0 ? watchedEps : (tr.status === 'completed' ? (item.totalEpisodes || 12) : 0);
          totalEpisodesWatched += effectiveEps;
          totalMinutes += effectiveEps * (item.runtime || (item.type === 'anime' ? 24 : 50));
        } else {
          // Feature film / Movie / Anime Movie
          if (tr.status === 'completed') {
            totalMoviesWatched += 1;
            totalMinutes += (item.runtime || 115) * (1 + (tr.rewatchCount || 0));
          }
        }
      } else {
        // Fallback calculation for non-cached items
        if (tr.status === 'completed') {
          totalMoviesWatched += 1;
          totalMinutes += 120;
        }
      }
    });

    const totalHoursWatched = Math.round((totalMinutes / 60) * 10) / 10;
    const totalShowsTracked = Object.keys(tracking).length;

    // Top genres
    const totalGenrePicks = Object.values(genreMap).reduce((a, b) => a + b, 0) || 1;
    const topGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: Math.round((count / totalGenrePicks) * 100),
      }));

    const averageRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0;

    // Compute streak from history entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const watchedDates = new Set(
      history.map(h => {
        const d = new Date(h.watchedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (watchedDates.has(d.getTime())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalHoursWatched,
      totalEpisodesWatched,
      totalMoviesWatched,
      totalShowsTracked,
      topGenres: topGenres.length > 0 ? topGenres : [],
      averageRating,
      streakDays: streak,
      watchedLast30Days: history.length,
    };
  }, [tracking, history, resolveMediaItem]);

  const contextValue = useMemo<TrackingContextType>(
    () => ({
      tracking,
      watchlists,
      history,
      stats,
      loading,
      mediaCache,
      resolveMediaItem,
      cacheMediaItem,
      refreshTracking,
      logMediaWatched,
      toggleEpisodeWatched,
      markSeasonWatched,
      markEpisodesUpTo,
      setWatchStatus,
      setRating,
      setReview,
      toggleFavorite,
      toggleReminder,
      incrementRewatch,
      createWatchlist,
      deleteWatchlist,
      toggleTitleInWatchlist,
      clearHistory,
      clearAllActivity,
      removeHistoryItem,
      getTrackingForTitle,
      getEpisodeProgress,
      getShowProgress,
    }),
    [
      tracking,
      watchlists,
      history,
      stats,
      loading,
      mediaCache,
      resolveMediaItem,
      cacheMediaItem,
      refreshTracking,
      logMediaWatched,
      toggleEpisodeWatched,
      markSeasonWatched,
      markEpisodesUpTo,
      setWatchStatus,
      setRating,
      setReview,
      toggleFavorite,
      toggleReminder,
      incrementRewatch,
      createWatchlist,
      deleteWatchlist,
      toggleTitleInWatchlist,
      clearHistory,
      clearAllActivity,
      removeHistoryItem,
      getTrackingForTitle,
      getEpisodeProgress,
      getShowProgress,
    ]
  );

  return (
    <TrackingContext.Provider value={contextValue}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider');
  return ctx;
};
