/**
 * TMDb Stylized Title Logo Service & Selector
 * 
 * Implements single-request optimization via `append_to_response=images`,
 * universal language fallback (never drops non-en logos),
 * robust ID sanitization and title resolution,
 * dual-layer zero-latency caching (In-Memory + sessionStorage),
 * and adaptive SVG/PNG ranking for rock-solid mobile and web display.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_MEDIA_ITEMS } from '../mockData';
import { POPULAR_ANIME_MAP } from './mapping/fribbAnime';

export interface TmdbLogo {
  aspect_ratio: number;
  height: number;
  iso_639_1: string | null;
  file_path: string;
  vote_average: number;
  vote_count: number;
  width: number;
}

export interface TmdbImageResponse {
  logos?: TmdbLogo[];
  backdrops?: unknown[];
  posters?: unknown[];
}

export interface TmdbDetailWithImages {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  images?: TmdbImageResponse;
}

export interface FetchTitleLogoOptions {
  apiKey?: string;
  originalLanguage?: string;
  title?: string;
  signal?: AbortSignal;
  preferPng?: boolean;
}

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const DEFAULT_TMDB_API_KEY = '1cf50e6248dc270629e802686245c2c8';
const CACHE_VERSION_PREFIX = '@hoqrux_logo_v2_';

// ============================================================================
// Zero-Latency Dual Cache Layer: In-Memory Map + Browser sessionStorage
// ============================================================================

const memoryLogoCache = new Map<string, string | null>();
const memoryAspectCache = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<string | null>>();

// Cleanup any legacy cache entries from sessionStorage and AsyncStorage
if (typeof window !== 'undefined' && window.sessionStorage) {
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('tmdb_logo_') && !k.startsWith('tmdb_logo_v2_')) {
        window.sessionStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore
  }
}

// Prune legacy unversioned AsyncStorage logo entries asynchronously on init
AsyncStorage.getAllKeys().then((keys) => {
  const legacyKeys = keys.filter((k) => k.startsWith('@hoqrux_logo_') && !k.startsWith(CACHE_VERSION_PREFIX));
  if (legacyKeys.length > 0) {
    AsyncStorage.multiRemove(legacyKeys).catch(() => {});
  }
}).catch(() => {});

/**
 * Normalizes title string for typo-tolerant matching and verification
 */
export function cleanTitle(t: string): string {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Robustly verifies whether a returned TMDb title matches the requested title
 */
export function isTitleMatch(expected: string, title?: string, origTitle?: string): boolean {
  if (!expected) return true;
  const cExp = cleanTitle(expected);
  if (!cExp) return true;

  const cTitle = title ? cleanTitle(title) : '';
  const cOrig = origTitle ? cleanTitle(origTitle) : '';

  if (cTitle === cExp || cOrig === cExp) return true;
  if (cTitle && (cTitle.includes(cExp) || cExp.includes(cTitle))) return true;
  if (cOrig && (cOrig.includes(cExp) || cExp.includes(cOrig))) return true;

  const expWords = cExp.split(' ').filter((w) => w.length > 2);
  if (expWords.length > 0) {
    const titleWords = cTitle.split(' ');
    const origWords = cOrig.split(' ');
    const matchedCount = expWords.filter((w) => titleWords.includes(w) || origWords.includes(w)).length;
    if (matchedCount >= Math.ceil(expWords.length * 0.6)) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves the true canonical media type ('movie' | 'tv') for any MediaItem or snippet.
 * Guarantees anime movies like "When Marnie Was There" are queried as 'movie' rather than 'tv'.
 */
export function getCanonicalMediaType(item?: {
  type?: string;
  id?: string;
  totalEpisodes?: number;
  seasons?: any[];
  runtime?: number;
}): 'movie' | 'tv' {
  if (!item) return 'movie';
  if (item.id?.startsWith('movie-')) return 'movie';
  if (item.id?.startsWith('tv-')) return 'tv';
  if (item.type === 'movie') return 'movie';
  if (item.type === 'tv') return 'tv';

  // Check multi-episode seasons
  if (item.seasons && item.seasons.length > 0 && item.seasons.some((s) => (s.episodes?.length || 0) > 1)) {
    return 'tv';
  }
  // Check totalEpisodes
  if (item.totalEpisodes && item.totalEpisodes > 1) {
    return 'tv';
  }
  // Check standalone movie runtime
  if (item.runtime && item.runtime > 45 && (!item.seasons || item.seasons.length <= 1) && (!item.totalEpisodes || item.totalEpisodes === 1)) {
    return 'movie';
  }
  if (item.type === 'anime') {
    return (item.totalEpisodes === 1 || (item.runtime && item.runtime > 45)) ? 'movie' : 'tv';
  }
  return 'movie';
}

/**
 * Normalizes title IDs to clean numeric keys or canonical slugs
 */
export function normalizeLogoId(id: number | string): string {
  if (typeof id === 'number' && !isNaN(id)) {
    // Check if it's an AniList or MAL ID in the popular map
    if (POPULAR_ANIME_MAP[id]?.tmdb) {
      return String(POPULAR_ANIME_MAP[id].tmdb);
    }
    const malEntry = Object.values(POPULAR_ANIME_MAP).find((m) => m.mal === id);
    if (malEntry?.tmdb) {
      return String(malEntry.tmdb);
    }
    return String(id);
  }

  const rawStr = String(id || '').trim();

  // If prefixed with anilist- or mal-, check popular map
  if (rawStr.startsWith('anilist-')) {
    const aniId = parseInt(rawStr.replace('anilist-', ''), 10);
    if (POPULAR_ANIME_MAP[aniId]?.tmdb) {
      return String(POPULAR_ANIME_MAP[aniId].tmdb);
    }
  } else if (rawStr.startsWith('mal-')) {
    const malId = parseInt(rawStr.replace('mal-', ''), 10);
    const malEntry = Object.values(POPULAR_ANIME_MAP).find((m) => m.mal === malId);
    if (malEntry?.tmdb) {
      return String(malEntry.tmdb);
    }
  }

  const clean = rawStr.replace(/^(movie|tv|tmdb)-/i, '');
  if (/^\d+$/.test(clean)) {
    return clean;
  }

  // Check known initial media mock slugs (e.g. tv-severance -> 95396, movie-dune-2 -> 693134)
  const localMatch = INITIAL_MEDIA_ITEMS.find(
    (m) =>
      m.id === rawStr ||
      m.id === `tv-${clean}` ||
      m.id === `movie-${clean}`
  );
  if (localMatch?.tmdbId && typeof localMatch.tmdbId === 'number') {
    return String(localMatch.tmdbId);
  }

  return clean;
}

/**
 * Builds the canonical cache key: `{mediaType}_{normalizedId}`
 */
export function getLogoCacheKey(mediaType: 'movie' | 'tv' | 'anime', id: number | string): string {
  const normType = mediaType === 'anime' ? 'movie' : mediaType;
  return `${normType}_${normalizeLogoId(id)}`;
}

/**
 * Synchronous lookup across In-Memory Map and sessionStorage.
 */
export function getCachedLogo(mediaType: 'movie' | 'tv' | 'anime', id: number | string): string | undefined {
  const key = getLogoCacheKey(mediaType, id);

  // 1. Tier 1: In-Memory Map (0ms synchronous lookup)
  const memHit = memoryLogoCache.get(key) || memoryLogoCache.get(`${mediaType}_${id}`);
  if (memHit) {
    return memHit;
  }

  // 2. Tier 2: sessionStorage (persists across page reloads & route navigation)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`tmdb_logo_v2_${key}`);
      if (stored && stored !== '__NONE__') {
        memoryLogoCache.set(key, stored);
        return stored;
      }
    } catch {
      // Ignore
    }
  }

  return undefined;
}

/**
 * Synchronous lookup for cached logo aspect ratio (Width / Height).
 */
export function getCachedLogoAspectRatio(mediaType: 'movie' | 'tv' | 'anime', id: number | string): number | undefined {
  const key = getLogoCacheKey(mediaType, id);
  return memoryAspectCache.get(key) || memoryAspectCache.get(`${mediaType}_${id}`);
}

/**
 * Persists resolved logo aspect ratio.
 */
export function setCachedLogoAspectRatio(mediaType: 'movie' | 'tv' | 'anime', id: number | string, ratio: number): void {
  const key = getLogoCacheKey(mediaType, id);
  if (ratio > 0) {
    memoryAspectCache.set(key, ratio);
    memoryAspectCache.set(`${mediaType}_${id}`, ratio);
  }
}

/**
 * Persists resolved logo URL to both In-Memory Map and AsyncStorage.
 */
export function setCachedLogo(mediaType: 'movie' | 'tv' | 'anime', id: number | string, url: string | null): void {
  const key = getLogoCacheKey(mediaType, id);

  if (url) {
    memoryLogoCache.set(key, url);
    memoryLogoCache.set(`${mediaType}_${id}`, url);
    AsyncStorage.setItem(`${CACHE_VERSION_PREFIX}${key}`, url).catch(() => {});
    AsyncStorage.setItem(`${CACHE_VERSION_PREFIX}${mediaType}_${id}`, url).catch(() => {});
  } else {
    memoryLogoCache.delete(key);
    memoryLogoCache.delete(`${mediaType}_${id}`);
    AsyncStorage.removeItem(`${CACHE_VERSION_PREFIX}${key}`).catch(() => {});
    AsyncStorage.removeItem(`${CACHE_VERSION_PREFIX}${mediaType}_${id}`).catch(() => {});
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (url) {
        window.sessionStorage.setItem(`tmdb_logo_v2_${key}`, url);
      } else {
        window.sessionStorage.removeItem(`tmdb_logo_v2_${key}`);
      }
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Utility to clear the logo cache (e.g. on logout or memory cleanup)
 */
export function clearLogoCache(): void {
  memoryLogoCache.clear();
  memoryAspectCache.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && (k.startsWith('tmdb_logo_') || k.startsWith('tmdb_logo_v2_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}

// ============================================================================
// ID Normalization & Resolution
// ============================================================================

/**
 * Resolves any ID (prefixed string, slug, or title) into a verified numeric TMDb ID.
 */
export async function resolveNumericTmdbId(
  mediaType: 'movie' | 'tv' | 'anime',
  id: number | string,
  title?: string,
  apiKey: string = DEFAULT_TMDB_API_KEY,
  signal?: AbortSignal
): Promise<number | null> {
  const normType = mediaType === 'anime' ? 'movie' : mediaType;

  // Check known POPULAR_ANIME_MAP by ID
  if (typeof id === 'number' && !isNaN(id)) {
    if (POPULAR_ANIME_MAP[id]?.tmdb) {
      return POPULAR_ANIME_MAP[id].tmdb!;
    }
    const malEntry = Object.values(POPULAR_ANIME_MAP).find((m) => m.mal === id);
    if (malEntry?.tmdb) {
      return malEntry.tmdb!;
    }
    return id;
  }

  const rawStr = String(id || '').trim();

  // If AniList prefix:
  if (rawStr.startsWith('anilist-')) {
    const aniId = parseInt(rawStr.replace('anilist-', ''), 10);
    if (POPULAR_ANIME_MAP[aniId]?.tmdb) {
      return POPULAR_ANIME_MAP[aniId].tmdb!;
    }
  } else if (rawStr.startsWith('mal-')) {
    const malId = parseInt(rawStr.replace('mal-', ''), 10);
    const malEntry = Object.values(POPULAR_ANIME_MAP).find((m) => m.mal === malId);
    if (malEntry?.tmdb) {
      return malEntry.tmdb!;
    }
  }

  const clean = rawStr.replace(/^(movie|tv|tmdb)-/i, '');
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }

  // Check known INITIAL_MEDIA_ITEMS
  const localMatch = INITIAL_MEDIA_ITEMS.find(
    (m) =>
      m.id === rawStr ||
      m.id === `tv-${clean}` ||
      m.id === `movie-${clean}` ||
      (title && m.title.toLowerCase() === title.toLowerCase())
  );
  if (localMatch?.tmdbId && typeof localMatch.tmdbId === 'number') {
    return localMatch.tmdbId;
  }

  // If title is available, query TMDb search to resolve true numeric ID
  const queryTitle = title || clean.replace(/[-_]/g, ' ');
  if (queryTitle && queryTitle.length > 1) {
    try {
      const searchUrl = `${TMDB_API_BASE}/search/${normType}?api_key=${apiKey}&query=${encodeURIComponent(queryTitle)}&page=1`;
      const res = await fetch(searchUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].id) {
          return data.results[0].id;
        }
      }
    } catch {
      // Ignore search error
    }
  }

  return null;
}

// ============================================================================
// Logo Selection & Fast-Loading Ranking Logic
// ============================================================================

/**
 * Selects the optimal stylized logo item from a TMDb `logos` array.
 * Supports universal fallback: English -> Original Language -> Neutral/Textless -> Any Language.
 */
export function extractBestLogoItem(
  logos: TmdbLogo[] = [],
  originalLanguage?: string,
  preferPng = false
): TmdbLogo | null {
  if (!Array.isArray(logos) || logos.length === 0) {
    return null;
  }

  // Filter out any entries without a file path
  const validLogos = logos.filter((l) => Boolean(l.file_path));
  if (validLogos.length === 0) {
    return null;
  }

  // Score each logo based on language match, format, and community ratings
  const scored = validLogos.map((logo) => {
    let score = 0;
    const lang = logo.iso_639_1 ? logo.iso_639_1.toLowerCase() : null;
    const isSvg = logo.file_path.toLowerCase().endsWith('.svg');

    // Language priority ranking:
    // English logos always take top priority for standard global UI display.
    // Original language (e.g. 'ja' for anime) takes high second priority.
    if (lang === 'en') {
      score += 500;
    } else if (originalLanguage && lang === originalLanguage.toLowerCase()) {
      score += 300;
    } else if (!lang) {
      // Textless / language-neutral logo
      score += 150;
    } else {
      score += 10; // Fallback to any available language so logo is never missing
    }

    // Format preference
    if (preferPng) {
      if (!isSvg) {
        score += 80;
      }
    } else if (isSvg) {
      score += 50;
    }

    // Aspect ratio bonus: standard wide logos (2.0 to 6.0) are ideal for title headers
    if (logo.aspect_ratio >= 1.5 && logo.aspect_ratio <= 7.0) {
      score += 15;
    }

    // Community rating & vote weight (capped so foreign translations never overpower English/original)
    score += Math.min((logo.vote_average || 0) * 5, 50);
    score += Math.min(logo.vote_count || 0, 15);

    return { logo, score };
  });

  // Sort descending by highest composite score
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.logo || null;
}

/**
 * Selects the optimal stylized logo URL from a TMDb `logos` array.
 */
export function extractBestLogo(
  logos: TmdbLogo[] = [],
  originalLanguage?: string,
  preferPng = false
): string | null {
  const best = extractBestLogoItem(logos, originalLanguage, preferPng);
  if (!best) return null;

  const filePath = best.file_path.startsWith('/') ? best.file_path : `/${best.file_path}`;
  if (preferPng) {
    return `${TMDB_IMAGE_BASE}/w500${filePath.replace(/\.svg$/i, '.png')}`;
  }
  if (best.file_path.toLowerCase().endsWith('.svg')) {
    return `${TMDB_IMAGE_BASE}/original${filePath}`;
  }
  return `${TMDB_IMAGE_BASE}/w500${filePath}`;
}

/**
 * Selects the best PNG logo specifically (for React Native mobile fallback)
 */
export function extractBestPngLogo(
  logos: TmdbLogo[] = [],
  originalLanguage?: string
): string | null {
  const pngLogos = (logos || []).filter((l) => l.file_path && !l.file_path.toLowerCase().endsWith('.svg'));
  return extractBestLogo(pngLogos, originalLanguage, true);
}

// ============================================================================
// Dynamic & Adaptive Visual Sizing Helpers
// ============================================================================

/**
 * Dynamically computes optically balanced logo dimensions based on intrinsic aspect ratio (W/H).
 */
export function getAdaptiveLogoHeight(
  aspectRatio?: number,
  isHero = false,
  explicitMaxHeight?: number
): {
  height: number;
  maxWidth: number | string;
} {
  if (explicitMaxHeight !== undefined) {
    return { height: explicitMaxHeight, maxWidth: '92%' };
  }

  if (!aspectRatio || aspectRatio <= 0) {
    return {
      height: isHero ? 96 : 56,
      maxWidth: '90%',
    };
  }

  if (aspectRatio < 1.4) {
    // Tall / Stacked / Badge (e.g. 1:1 - 1.3:1)
    return {
      height: isHero ? 68 : 44,
      maxWidth: '80%',
    };
  } else if (aspectRatio < 2.2) {
    // Compact 2-line stacked (e.g. 1.4:1 - 2.1:1)
    return {
      height: isHero ? 82 : 52,
      maxWidth: '85%',
    };
  } else if (aspectRatio < 4.0) {
    // Standard Landscape (e.g. 2.2:1 - 3.9:1)
    return {
      height: isHero ? 98 : 58,
      maxWidth: '90%',
    };
  } else if (aspectRatio < 6.0) {
    // Wide Landscape (e.g. 4.0:1 - 5.9:1)
    return {
      height: isHero ? 112 : 64,
      maxWidth: '95%',
    };
  } else {
    // Ultra-wide banner (e.g. 6.0+:1)
    return {
      height: isHero ? 122 : 68,
      maxWidth: '98%',
    };
  }
}

/**
 * Dynamically scales fallback title typography based on character count to prevent multi-line wrapping overflows.
 */
export function getAdaptiveFallbackTitleStyle(
  title: string,
  isHero = false
): {
  fontSize: number;
  lineHeight: number;
} {
  const len = title?.trim().length || 0;

  if (isHero) {
    if (len <= 8) {
      return { fontSize: 36, lineHeight: 40 };
    } else if (len <= 18) {
      return { fontSize: 30, lineHeight: 34 };
    } else if (len <= 30) {
      return { fontSize: 24, lineHeight: 28 };
    } else {
      return { fontSize: 20, lineHeight: 24 };
    }
  } else {
    // Detail / standard screens
    if (len <= 8) {
      return { fontSize: 28, lineHeight: 32 };
    } else if (len <= 18) {
      return { fontSize: 23, lineHeight: 27 };
    } else if (len <= 30) {
      return { fontSize: 19, lineHeight: 23 };
    } else {
      return { fontSize: 16, lineHeight: 20 };
    }
  }
}

// ============================================================================
// Single-Request API Fetch Function
// ============================================================================

/**
 * Fetches title details and images in a SINGLE network call using:
 * `append_to_response=images` without language restrictions.
 * 
 * Optimized for zero latency:
 * - Checks synchronous memory and sessionStorage cache first
 * - Normalizes IDs and resolves slugs/numeric IDs automatically
 * - Retrieves all logos across all languages in a single query
 * - Prioritizes crisp PNGs for rock-solid mobile display
 * - Caches resolved URLs automatically
 */
export async function fetchTitleLogo(
  mediaType: 'movie' | 'tv' | 'anime',
  id: number | string,
  options: FetchTitleLogoOptions = {}
): Promise<string | null> {
  // 1. Instant Cache Check (0ms)
  const cached = getCachedLogo(mediaType, id);
  if (cached) {
    return cached;
  }

  const cacheKey = getLogoCacheKey(mediaType, id);
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const requestPromise = (async () => {
    // 1b. Check AsyncStorage (persists across app restarts)
    try {
      const persisted = await AsyncStorage.getItem(`${CACHE_VERSION_PREFIX}${cacheKey}`);
      if (persisted && persisted !== '__NONE__') {
        memoryLogoCache.set(cacheKey, persisted);
        memoryLogoCache.set(`${mediaType}_${id}`, persisted);
        return persisted;
      }
    } catch {
      // Continue to fetch
    }

    const apiKey = options.apiKey || DEFAULT_TMDB_API_KEY;
    const originalLanguage = options.originalLanguage?.toLowerCase();
    const preferPng = options.preferPng ?? true;
    let currentMediaType: 'movie' | 'tv' = mediaType === 'anime' ? 'movie' : mediaType;

    // 2. Resolve clean numeric TMDb ID
    let numericId = await resolveNumericTmdbId(currentMediaType, id, options.title, apiKey, options.signal);
    if (!numericId && options.title) {
      // Fallback search across both movie & tv
      try {
        const searchUrl = `${TMDB_API_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(options.title)}&page=1`;
        const sRes = await fetch(searchUrl, { signal: options.signal });
        if (sRes.ok) {
          const sData = await sRes.json();
          const match = (sData.results || []).find((r: any) =>
            (r.media_type === 'movie' || r.media_type === 'tv') &&
            isTitleMatch(options.title!, r.title || r.name, r.original_title || r.original_name)
          );
          if (match?.id) {
            numericId = match.id;
            currentMediaType = match.media_type;
          }
        }
      } catch {
        // continue
      }
    }

    if (!numericId) {
      return null;
    }

    // Check cache for the resolved numeric ID
    const numericCached = getCachedLogo(currentMediaType, numericId);
    if (numericCached) {
      setCachedLogo(mediaType, id, numericCached);
      setCachedLogo(currentMediaType, numericId, numericCached);
      return numericCached;
    }

    let logos: TmdbLogo[] = [];
    let effectiveOriginalLang = originalLanguage;

    // 3. Single-request fetch with append_to_response=images on primary mediaType
    let titleVerified = false;
    try {
      const url = `${TMDB_API_BASE}/${currentMediaType}/${numericId}?api_key=${apiKey}&append_to_response=images`;
      const res = await fetch(url, { signal: options.signal });
      if (res.ok) {
        const data: TmdbDetailWithImages = await res.json();
        const matches = !options.title || isTitleMatch(options.title, data.title || data.name, data.original_title || data.original_name);
        if (matches) {
          titleVerified = true;
          effectiveOriginalLang = (data.original_language || originalLanguage)?.toLowerCase();
          logos = data.images?.logos || [];
        }
      }
    } catch {
      // Continue to fallback
    }

    // 4. If title did NOT match primary mediaType (e.g. "When Marnie Was There" queried as tv),
    // immediately attempt opposite mediaType (tv <-> movie)
    if (!titleVerified) {
      const altMediaType: 'movie' | 'tv' = currentMediaType === 'movie' ? 'tv' : 'movie';
      try {
        const altUrl = `${TMDB_API_BASE}/${altMediaType}/${numericId}?api_key=${apiKey}&append_to_response=images`;
        const altRes = await fetch(altUrl, { signal: options.signal });
        if (altRes.ok) {
          const altData = await altRes.json();
          const altMatches = !options.title || isTitleMatch(options.title, altData.title || altData.name, altData.original_title || altData.original_name);
          if (altMatches) {
            titleVerified = true;
            currentMediaType = altMediaType;
            effectiveOriginalLang = (altData.original_language || originalLanguage)?.toLowerCase();
            logos = altData.images?.logos || [];
          }
        }
      } catch {
        // Continue to search fallback
      }
    }

    // 5. If title still unverified or wrong show/movie returned, query TMDb multi-search
    if (!titleVerified && options.title && options.title.trim().length > 1) {
      try {
        const searchUrl = `${TMDB_API_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(options.title)}&page=1`;
        const sRes = await fetch(searchUrl, { signal: options.signal });
        if (sRes.ok) {
          const sData = await sRes.json();
          const candidate = (sData.results || []).find((r: any) =>
            (r.media_type === 'movie' || r.media_type === 'tv') &&
            isTitleMatch(options.title!, r.title || r.name, r.original_title || r.original_name)
          );
          if (candidate?.id) {
            const candType = candidate.media_type as 'movie' | 'tv';
            currentMediaType = candType;
            numericId = candidate.id;
            const candUrl = `${TMDB_API_BASE}/${candType}/${candidate.id}?api_key=${apiKey}&append_to_response=images`;
            const candRes = await fetch(candUrl, { signal: options.signal });
            if (candRes.ok) {
              const candData = await candRes.json();
              logos = candData.images?.logos || [];
              effectiveOriginalLang = (candData.original_language || originalLanguage)?.toLowerCase();
              titleVerified = true;
            }
          }
        }
      } catch {
        // Ignore search error
      }
    }

    // 6. Dedicated /images endpoint fallback if append_to_response was empty
    if ((!logos || logos.length === 0) && numericId) {
      try {
        const imagesUrl = `${TMDB_API_BASE}/${currentMediaType}/${numericId}/images?api_key=${apiKey}`;
        const imgRes = await fetch(imagesUrl, { signal: options.signal });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          logos = imgData.logos || [];
        }
      } catch {
        // Continue
      }
    }

    const bestItem = extractBestLogoItem(logos, effectiveOriginalLang, preferPng);
    let resolvedUrl: string | null = null;
    if (bestItem) {
      const filePath = bestItem.file_path.startsWith('/') ? bestItem.file_path : `/${bestItem.file_path}`;
      if (preferPng) {
        resolvedUrl = `${TMDB_IMAGE_BASE}/w500${filePath.replace(/\.svg$/i, '.png')}`;
      } else if (bestItem.file_path.toLowerCase().endsWith('.svg')) {
        resolvedUrl = `${TMDB_IMAGE_BASE}/original${filePath}`;
      } else {
        resolvedUrl = `${TMDB_IMAGE_BASE}/w500${filePath}`;
      }
      if (bestItem.aspect_ratio > 0) {
        setCachedLogoAspectRatio(currentMediaType, id, bestItem.aspect_ratio);
        if (numericId) {
          setCachedLogoAspectRatio(currentMediaType, numericId, bestItem.aspect_ratio);
        }
        setCachedLogoAspectRatio(mediaType, id, bestItem.aspect_ratio);
      }
    }

    // Cache resolved URL on all key variations
    setCachedLogo(currentMediaType, id, resolvedUrl);
    if (numericId) {
      setCachedLogo(currentMediaType, numericId, resolvedUrl);
    }
    setCachedLogo(mediaType, id, resolvedUrl);
    return resolvedUrl;
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  requestPromise.finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  return requestPromise;
}
