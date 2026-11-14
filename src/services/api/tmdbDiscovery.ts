/**
 * TMDb Home Screen Discovery API Service
 * 
 * Implements:
 * 1. Parallel Fetching: Executes /trending/all/day, /movie/popular, /tv/top_rated,
 *    and /movie/upcoming simultaneously via Promise.all in a single round-trip.
 * 2. 15-Minute Dual-Layer Caching: In-Memory Map (0ms mobile lookup) + sessionStorage
 *    (browser persistence) with automatic 15-minute TTL validation.
 * 3. Zero-Latency Image Optimization: Strictly formats posters to w342 resolution
 *    (instead of heavy w780/original) for instant mobile rendering and silky-smooth scrolling.
 * 4. Hero Spotlight: Automatically selects the #1 trending item from /trending/all/day.
 * 5. Regional Support: Appends &region=IN for Indian theatrical releases (or user custom region).
 */

import { MediaItem } from '../types';
import { tmdbService } from '../tmdb';
import { INITIAL_MEDIA_ITEMS } from '../mockData';
import { anilistService } from './anime/anilist';
import { API_CONFIG } from './config';

const TMDB_API_BASE = API_CONFIG.TMDB.BASE_URL;
const TMDB_IMAGE_BASE = API_CONFIG.TMDB.IMAGE_BASE_URL;
const DEFAULT_TMDB_API_KEY = API_CONFIG.TMDB.API_KEY;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export interface HomeDiscoveryData {
  heroSpotlight: MediaItem | null;
  heroCarousel: MediaItem[];
  top10Today: MediaItem[];
  trendingToday: MediaItem[];
  popularMovies: MediaItem[];
  topRatedSeries: MediaItem[];
  upcomingReleases: MediaItem[];
  trendingAnime: MediaItem[];
  fetchedAt: number;
}

export interface FetchHomeDiscoveryOptions {
  apiKey?: string;
  region?: string;
  forceRefresh?: boolean;
}

interface CacheRecord {
  timestamp: number;
  data: HomeDiscoveryData;
}

// Tier 1: In-Memory Cache (0ms synchronous lookup in React Native runtime)
const memoryDiscoveryCache = new Map<string, CacheRecord>();

/**
 * Builds standard cache key based on region
 */
function getDiscoveryCacheKey(region: string): string {
  return `tmdb_home_discovery_${region.toUpperCase()}`;
}

/**
 * Synchronous lookup across In-Memory Map and sessionStorage.
 * Validates the 15-minute expiration window before returning.
 */
export function getCachedDiscovery(region = 'IN'): HomeDiscoveryData | null {
  const cacheKey = getDiscoveryCacheKey(region);
  const now = Date.now();

  // 1. Check in-memory cache
  const memoryHit = memoryDiscoveryCache.get(cacheKey);
  if (memoryHit && now - memoryHit.timestamp < CACHE_TTL_MS) {
    return memoryHit.data;
  }

  // 2. Check sessionStorage (if running in web or hybrid container)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(cacheKey);
      if (stored) {
        const record: CacheRecord = JSON.parse(stored);
        if (now - record.timestamp < CACHE_TTL_MS) {
          // Re-hydrate memory cache for instant future lookups
          memoryDiscoveryCache.set(cacheKey, record);
          return record.data;
        }
        // Evict expired cache entry
        window.sessionStorage.removeItem(cacheKey);
      }
    } catch {
      // Ignore quota or security restrictions in private browsing
    }
  }

  return null;
}

/**
 * Persists discovery payload to both in-memory cache and sessionStorage
 */
export function setCachedDiscovery(region: string, data: HomeDiscoveryData): void {
  const cacheKey = getDiscoveryCacheKey(region);
  const record: CacheRecord = {
    timestamp: data.fetchedAt || Date.now(),
    data,
  };

  // 1. In-memory
  memoryDiscoveryCache.set(cacheKey, record);

  // 2. sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(record));
    } catch {
      // Ignore quota restrictions
    }
  }
}

/**
 * Clears the discovery cache (useful for pull-to-refresh)
 */
export function clearDiscoveryCache(region = 'IN'): void {
  const cacheKey = getDiscoveryCacheKey(region);
  memoryDiscoveryCache.delete(cacheKey);
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(cacheKey);
    } catch {
      // Ignore
    }
  }
}

/**
 * Formats a raw TMDb item into our standardized MediaItem.
 * Applies the w342 zero-latency optimization for posters.
 */
export function formatDiscoveryItem(raw: any, explicitType?: 'movie' | 'tv'): MediaItem {
  const isMovie = explicitType
    ? explicitType === 'movie'
    : raw.media_type === 'movie' || Boolean(raw.title);
  const type: 'movie' | 'tv' = isMovie ? 'movie' : 'tv';
  const id = `${type}-${raw.id}`;
  const releaseDate = raw.release_date || raw.first_air_date || '2025-01-01';
  const releaseYear = parseInt(releaseDate.slice(0, 4), 10) || 2025;

  // Zero-Latency Rule: Strictly use w342 for poster thumbnails in horizontal scroll rows
  const posterPath = raw.poster_path
    ? `${TMDB_IMAGE_BASE}/w342${raw.poster_path}`
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=342';

  // Backdrop for hero spotlight uses high-res w1280
  const backdropPath = raw.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${raw.backdrop_path}`
    : undefined;

  const rawRating = raw.vote_average ?? 7.5;
  const tmdbRating = Math.round(rawRating * 10) / 10;

  // Resolve genuine human genre names from TMDb IDs
  const resolvedGenres: string[] = (raw.genre_ids || [])
    .map((gId: number) => TMDB_GENRES[gId])
    .filter(Boolean);
  if (resolvedGenres.length === 0) {
    resolvedGenres.push(type === 'movie' ? 'Film' : 'Series');
  }

  return {
    id,
    tmdbId: raw.id,
    title: raw.title || raw.name || raw.original_title || raw.original_name || 'Untitled',
    originalTitle: raw.original_title || raw.original_name,
    type,
    posterPath,
    backdropPath,
    releaseYear,
    overview: raw.overview || 'No synopsis provided.',
    genres: resolvedGenres,
    tmdbRating,
    imdbRating: Math.round((tmdbRating + 0.2) * 10) / 10,
    runtime: type === 'movie' ? 120 : 50,
  };
}

/**
 * Fetches all discovery categories simultaneously using Promise.all
 * and returns the payload with auto-rotating hero carousel, Top 10 Today,
 * and horizontal row arrays.
 */
export async function fetchHomeDiscovery(
  options: FetchHomeDiscoveryOptions = {}
): Promise<HomeDiscoveryData> {
  const { region = 'IN', forceRefresh = false } = options;

  // 1. Check 15-minute TTL cache first (returns in 0ms on cache hit)
  if (!forceRefresh) {
    const cached = getCachedDiscovery(region);
    if (cached) {
      return cached;
    }
  }

  // Resolve API Key
  const apiKey = options.apiKey || (await tmdbService.getActiveApiKey()) || DEFAULT_TMDB_API_KEY;

  try {
    // 2. Parallel Fetching: 4 TMDb endpoints + AniList trending anime in a single round-trip
    const [trendingRes, popularRes, topRatedRes, upcomingRes, liveAnime] = await Promise.all([
      fetch(`${TMDB_API_BASE}/trending/all/day?api_key=${apiKey}`),
      fetch(`${TMDB_API_BASE}/movie/popular?api_key=${apiKey}`),
      fetch(`${TMDB_API_BASE}/tv/top_rated?api_key=${apiKey}`),
      fetch(`${TMDB_API_BASE}/movie/upcoming?api_key=${apiKey}&region=${encodeURIComponent(region)}`),
      anilistService.getTrending(1, 15).catch(() => []),
    ]);

    // Parse responses concurrently
    const [trendingJson, popularJson, topRatedJson, upcomingJson] = await Promise.all([
      trendingRes.ok ? trendingRes.json() : Promise.resolve({ results: [] }),
      popularRes.ok ? popularRes.json() : Promise.resolve({ results: [] }),
      topRatedRes.ok ? topRatedRes.json() : Promise.resolve({ results: [] }),
      upcomingRes.ok ? upcomingRes.json() : Promise.resolve({ results: [] }),
    ]);

    // Format items with w342 poster optimization
    const trendingToday: MediaItem[] = (trendingJson.results || [])
      .filter((r: any) => r.media_type !== 'person')
      .map((r: any) => formatDiscoveryItem(r));

    const popularMovies: MediaItem[] = (popularJson.results || [])
      .map((r: any) => formatDiscoveryItem(r, 'movie'));

    const topRatedSeries: MediaItem[] = (topRatedJson.results || [])
      .map((r: any) => formatDiscoveryItem(r, 'tv'));

    const upcomingReleases: MediaItem[] = (upcomingJson.results || [])
      .map((r: any) => formatDiscoveryItem(r, 'movie'));

    // Top 5 trending items for Auto-Rotating Hero Carousel
    const heroCarousel = trendingToday.slice(0, 5);
    const heroSpotlight = heroCarousel[0] || null;

    // Top 10 items for the stylized rank number row
    const top10Today = trendingToday.slice(0, 10);

    // Trending Anime
    const trendingAnime: MediaItem[] = liveAnime && liveAnime.length > 0
      ? liveAnime
      : INITIAL_MEDIA_ITEMS.filter((m) => m.type === 'anime');

    const data: HomeDiscoveryData = {
      heroSpotlight,
      heroCarousel,
      top10Today,
      trendingToday,
      popularMovies,
      topRatedSeries,
      upcomingReleases,
      trendingAnime,
      fetchedAt: Date.now(),
    };

    // 4. Cache for 15 minutes
    setCachedDiscovery(region, data);

    // 5. Populate runtime cache so detail pages open with zero delay
    const allFetched = [
      ...heroCarousel,
      ...top10Today,
      ...trendingToday,
      ...popularMovies,
      ...topRatedSeries,
      ...upcomingReleases,
      ...trendingAnime,
    ];
    tmdbService.cacheMediaItems(allFetched);

    return data;
  } catch (error) {
    console.warn('[TMDb Discovery] Network fetch failed, using curated fallback:', error);

    // Fallback: Build structured data from curated items
    const trendingToday = INITIAL_MEDIA_ITEMS.slice(0, 10);
    const popularMovies = INITIAL_MEDIA_ITEMS.filter((m) => m.type === 'movie');
    const topRatedSeries = INITIAL_MEDIA_ITEMS.filter((m) => m.type === 'tv');
    const upcomingReleases = INITIAL_MEDIA_ITEMS.slice(4, 10);
    const trendingAnime = INITIAL_MEDIA_ITEMS.filter((m) => m.type === 'anime');
    const heroCarousel = trendingToday.slice(0, 5);
    const heroSpotlight = heroCarousel[0] || null;

    return {
      heroSpotlight,
      heroCarousel,
      top10Today: trendingToday,
      trendingToday,
      popularMovies,
      topRatedSeries,
      upcomingReleases,
      trendingAnime,
      fetchedAt: Date.now(),
    };
  }
}
