import AsyncStorage from '@react-native-async-storage/async-storage';
import { tmdbService } from './tmdb';

export interface AiringEpisode {
  id: string; // e.g. "tv-84773-s3e7"
  showId: string; // "tv-84773"
  showTitle: string;
  showPoster: string;
  showBackdrop?: string;
  network?: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  airDate: string; // "YYYY-MM-DD"
  daysUntil: number; // 0 = today, 1 = tomorrow, negative = past
  countdownLabel: string; // "AIRS TODAY", "TOMORROW", "IN 3 DAYS", etc.
  badgeColor: string;
  formattedDate: string;
  isMyShow: boolean;
  isAiringToday: boolean;
  overview?: string;
}

export interface ReleaseRadarData {
  myRadar: AiringEpisode[];
  today: AiringEpisode[];
  thisWeek: AiringEpisode[];
  upcoming: AiringEpisode[];
  lastUpdated: number;
}

const STORAGE_KEY = '@hoqrux_release_radar_v1';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export function computeCountdown(airDateStr?: string): {
  daysUntil: number;
  countdownLabel: string;
  badgeColor: string;
  formattedDate: string;
} {
  if (!airDateStr) {
    return {
      daysUntil: 999,
      countdownLabel: 'TBA',
      badgeColor: '#71717A',
      formattedDate: 'TBA',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const airDate = new Date(airDateStr + 'T00:00:00');
  const diffMs = airDate.getTime() - today.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = airDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (daysUntil === 0) {
    return { daysUntil, countdownLabel: 'AIRS TODAY', badgeColor: '#E50914', formattedDate };
  } else if (daysUntil === 1) {
    return { daysUntil, countdownLabel: 'TOMORROW', badgeColor: '#F59E0B', formattedDate };
  } else if (daysUntil > 1 && daysUntil <= 7) {
    return { daysUntil, countdownLabel: `IN ${daysUntil} DAYS`, badgeColor: '#3B82F6', formattedDate };
  } else if (daysUntil > 7 && daysUntil <= 30) {
    const weeks = Math.ceil(daysUntil / 7);
    return { daysUntil, countdownLabel: `IN ${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'}`, badgeColor: '#8B5CF6', formattedDate };
  } else if (daysUntil > 30) {
    return {
      daysUntil,
      countdownLabel: airDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
      badgeColor: '#71717A',
      formattedDate,
    };
  } else if (daysUntil === -1) {
    return { daysUntil, countdownLabel: 'YESTERDAY', badgeColor: '#52525B', formattedDate };
  } else {
    return { daysUntil, countdownLabel: `${Math.abs(daysUntil)}D AGO`, badgeColor: '#52525B', formattedDate };
  }
}

class AiringCalendarService {
  private memoryCache: ReleaseRadarData | null = null;
  private pendingPromise: Promise<ReleaseRadarData> | null = null;

  async getReleaseRadar(trackedShowIds: string[] = [], forceRefresh = false): Promise<ReleaseRadarData> {
    const now = Date.now();

    // 1. Check memory cache
    if (!forceRefresh && this.memoryCache && now - this.memoryCache.lastUpdated < CACHE_TTL_MS) {
      return this.enrichWithTracked(this.memoryCache, trackedShowIds);
    }

    // 2. Check AsyncStorage cache
    if (!forceRefresh) {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: ReleaseRadarData = JSON.parse(raw);
          if (now - parsed.lastUpdated < CACHE_TTL_MS) {
            this.memoryCache = parsed;
            return this.enrichWithTracked(parsed, trackedShowIds);
          }
        }
      } catch {
        // Fall through to network
      }
    }

    // 3. If a fetch is already in-flight, await the exact same promise to deduplicate network requests
    if (this.pendingPromise) {
      const result = await this.pendingPromise;
      return this.enrichWithTracked(result, trackedShowIds);
    }

    // 4. Fetch fresh data from TMDb
    this.pendingPromise = (async () => {
      try {
        const freshData = await this.buildFreshRadarData(trackedShowIds);
        this.memoryCache = freshData;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshData)).catch(() => {});
        return freshData;
      } catch (e) {
        console.warn('Failed to build fresh release radar:', e);
        if (this.memoryCache) return this.enrichWithTracked(this.memoryCache, trackedShowIds);
        return {
          myRadar: [],
          today: [],
          thisWeek: [],
          upcoming: [],
          lastUpdated: now,
        };
      } finally {
        this.pendingPromise = null;
      }
    })();

    const finalData = await this.pendingPromise;
    return this.enrichWithTracked(finalData, trackedShowIds);
  }

  private enrichWithTracked(data: ReleaseRadarData, trackedShowIds: string[]): ReleaseRadarData {
    const trackedSet = new Set(trackedShowIds);
    const updateEpisode = (ep: AiringEpisode): AiringEpisode => ({
      ...ep,
      isMyShow: trackedSet.has(ep.showId),
    });

    return {
      ...data,
      myRadar: data.myRadar.map(updateEpisode),
      today: data.today.map(updateEpisode),
      thisWeek: data.thisWeek.map(updateEpisode),
      upcoming: data.upcoming.map(updateEpisode),
    };
  }

  private async buildFreshRadarData(trackedShowIds: string[]): Promise<ReleaseRadarData> {
    const episodesMap = new Map<string, AiringEpisode>();
    const trackedSet = new Set(trackedShowIds);

    // Step A: Fetch details for user's tracked TV shows
    const trackedTvIds = trackedShowIds.filter((id) => id.startsWith('tv-') || !id.startsWith('movie-'));
    const trackedDetailsPromises = trackedTvIds.slice(0, 6).map(async (showId) => {
      try {
        const details = await tmdbService.getMediaDetails(showId);
        if (details && details.type !== 'movie' && details.nextEpisodeToAir) {
          const next = details.nextEpisodeToAir;
          const { daysUntil, countdownLabel, badgeColor, formattedDate } = computeCountdown(next.airDate);
          const epId = `${showId}-s${next.seasonNumber}e${next.episodeNumber}`;

          episodesMap.set(epId, {
            id: epId,
            showId,
            showTitle: details.title,
            showPoster: details.posterPath,
            showBackdrop: details.backdropPath,
            network: details.network,
            seasonNumber: next.seasonNumber,
            episodeNumber: next.episodeNumber,
            episodeTitle: next.title,
            airDate: next.airDate,
            daysUntil,
            countdownLabel,
            badgeColor,
            formattedDate,
            isMyShow: true,
            isAiringToday: daysUntil === 0,
          });
        }
      } catch {
        // Skip on error
      }
    });

    // Step B: Fetch On The Air TV series from TMDb (episodes airing in the next 7 days)
    const onTheAirPromise = (async () => {
      try {
        const onAirShows = await tmdbService.getOnTheAirShows(1);
        // Take top 6 popular shows to optimize connection pool on web & mobile
        const topShows = onAirShows.slice(0, 6);
        await Promise.all(
          topShows.map(async (show) => {
            try {
              const details = await tmdbService.getMediaDetails(show.id);
              if (details && details.nextEpisodeToAir) {
                const next = details.nextEpisodeToAir;
                const { daysUntil, countdownLabel, badgeColor, formattedDate } = computeCountdown(next.airDate);
                const epId = `${show.id}-s${next.seasonNumber}e${next.episodeNumber}`;

                if (!episodesMap.has(epId)) {
                  episodesMap.set(epId, {
                    id: epId,
                    showId: show.id,
                    showTitle: details.title,
                    showPoster: details.posterPath,
                    showBackdrop: details.backdropPath,
                    network: details.network,
                    seasonNumber: next.seasonNumber,
                    episodeNumber: next.episodeNumber,
                    episodeTitle: next.title,
                    airDate: next.airDate,
                    daysUntil,
                    countdownLabel,
                    badgeColor,
                    formattedDate,
                    isMyShow: trackedSet.has(show.id),
                    isAiringToday: daysUntil === 0,
                  });
                }
              }
            } catch {
              // Ignore single show error
            }
          })
        );
      } catch (e) {
        console.warn('Error fetching on_the_air shows:', e);
      }
    })();

    // Wait for tracked shows and on-the-air shows to resolve
    await Promise.all([...trackedDetailsPromises, onTheAirPromise]);

    const allEpisodes = Array.from(episodesMap.values());

    // Sort by air date / days until (soonest first)
    allEpisodes.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return a.showTitle.localeCompare(b.showTitle);
    });

    const myRadar = allEpisodes.filter((ep) => ep.isMyShow && ep.daysUntil >= 0);
    const today = allEpisodes.filter((ep) => ep.daysUntil === 0);
    const thisWeek = allEpisodes.filter((ep) => ep.daysUntil >= 0 && ep.daysUntil <= 7);
    const upcoming = allEpisodes.filter((ep) => ep.daysUntil > 7);

    return {
      myRadar,
      today,
      thisWeek,
      upcoming,
      lastUpdated: Date.now(),
    };
  }
}

export const airingCalendarService = new AiringCalendarService();
