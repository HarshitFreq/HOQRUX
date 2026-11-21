/**
 * Genre Catalogue Service
 * 
 * Provides API-driven discovery across rich film, television, and anime genres:
 * - TMDb API /discover endpoints with genre ID mapping and query parameters
 * - Format filtering: All, Films, Series
 * - Sort options: Popularity, Top Rated (Acclaimed), Newest (Recent releases)
 * - 30-Minute Dual-Layer Caching (AsyncStorage + In-Memory)
 * - Infinite pagination support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MediaItem } from './types';
import { tmdbService } from './tmdb';
import { INITIAL_MEDIA_ITEMS } from './mockData';

export type GenreFormat = 'all' | 'movie' | 'tv' | 'anime';
export type GenreSort = 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';

export interface GenreDefinition {
  id: string;
  name: string;
  tagline: string;
  badge: string;
}

export const GENRE_DEFINITIONS: GenreDefinition[] = [
  { id: 'ALL', name: 'ALL GENRES', tagline: 'Universal collective catalog across cinema, series, and anime', badge: 'ALL' },
  { id: 'SCI-FI', name: 'SCI-FI', tagline: 'Futuristic worlds, cyberpunk realities, and deep space odysseys', badge: 'SPECULATIVE' },
  { id: 'ACTION', name: 'ACTION', tagline: 'High-octane spectacles, adrenaline chases, and martial arts', badge: 'HIGH OCTANE' },
  { id: 'THRILLER', name: 'THRILLER', tagline: 'Edge-of-your-seat suspense, tension, and psychological twists', badge: 'SUSPENSE' },
  { id: 'DRAMA', name: 'DRAMA', tagline: 'Award-winning storytelling, deep emotion, and character arcs', badge: 'PRESTIGE' },
  { id: 'ANIME', name: 'ANIME', tagline: 'Visionary Japanese animation, epic sagas, and stylized worlds', badge: 'ANIMATION' },
  { id: 'HORROR', name: 'HORROR', tagline: 'Supernatural dread, psychological chills, and haunting tales', badge: 'MACABRE' },
  { id: 'MYSTERY', name: 'MYSTERY', tagline: 'Puzzling enigmas, detective cases, and atmospheric whodunits', badge: 'INVESTIGATION' },
  { id: 'FANTASY', name: 'FANTASY', tagline: 'Mythical realms, magic systems, and ancient legends', badge: 'MYTHIC' },
  { id: 'COMEDY', name: 'COMEDY', tagline: 'Witty satire, irreverent humor, and lighthearted comfort', badge: 'COMEDIC' },
  { id: 'CRIME', name: 'CRIME', tagline: 'Underworld syndicates, heist masterminds, and gritty investigations', badge: 'NOIR' },
  { id: 'ADVENTURE', name: 'ADVENTURE', tagline: 'Expeditions into the unknown, wilderness treks, and survival', badge: 'EXPEDITION' },
  { id: 'ROMANCE', name: 'ROMANCE', tagline: 'Passionate love stories, emotional journeys, and heartbreak', badge: 'PASSION' },
  { id: 'DOCUMENTARY', name: 'DOCUMENTARY', tagline: 'Real-world investigations, nature wonders, and historical accounts', badge: 'REALITY' },
  { id: 'WAR', name: 'WAR', tagline: 'Historical battlefields, military tactics, and wartime heroism', badge: 'HISTORICAL' },
];

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const memoryCache = new Map<string, { timestamp: number; items: MediaItem[] }>();

function matchesGenreFallback(itemGenres: string[] | undefined, targetGenre: string): boolean {
  if (!itemGenres || itemGenres.length === 0) return false;
  if (targetGenre === 'ALL') return true;
  const target = targetGenre.toUpperCase().trim();
  return itemGenres.some((g) => {
    const norm = g.toUpperCase().trim();
    if (norm === target) return true;
    if (target === 'SCI-FI' && (norm.includes('SCIENCE FICTION') || norm.includes('SCI-FI'))) return true;
    if (target === 'ACTION' && norm.includes('ACTION')) return true;
    if (target === 'ANIMATION' && (norm.includes('ANIMATION') || norm.includes('ANIME'))) return true;
    if (target === 'ANIME' && (norm.includes('ANIMATION') || norm.includes('ANIME'))) return true;
    if (target === 'COMEDY' && norm.includes('COMEDY')) return true;
    if (target === 'HORROR' && norm.includes('HORROR')) return true;
    if (target === 'THRILLER' && norm.includes('THRILLER')) return true;
    if (target === 'CRIME' && norm.includes('CRIME')) return true;
    if (target === 'MYSTERY' && norm.includes('MYSTERY')) return true;
    if (target === 'FANTASY' && norm.includes('FANTASY')) return true;
    if (target === 'ADVENTURE' && norm.includes('ADVENTURE')) return true;
    if (target === 'DRAMA' && norm.includes('DRAMA')) return true;
    return norm.includes(target) || target.includes(norm);
  });
}

export const genreCatalogueService = {
  getGenreList(): GenreDefinition[] {
    return GENRE_DEFINITIONS;
  },

  getGenreMeta(genreId: string): GenreDefinition {
    return (
      GENRE_DEFINITIONS.find((g) => g.id.toUpperCase() === genreId.toUpperCase()) ||
      GENRE_DEFINITIONS[0]
    );
  },

  async fetchGenreItems(options: {
    genreId: string;
    format?: GenreFormat;
    sort?: GenreSort;
    page?: number;
    forceRefresh?: boolean;
  }): Promise<MediaItem[]> {
    const {
      genreId,
      format = 'all',
      sort = 'popularity.desc',
      page = 1,
      forceRefresh = false,
    } = options;

    const cacheKey = `@hoqrux_genre_cat_${genreId.toUpperCase()}_${format}_${sort}_p${page}`;

    // 1. In-memory check (0ms)
    if (!forceRefresh) {
      const memHit = memoryCache.get(cacheKey);
      if (memHit && Date.now() - memHit.timestamp < CACHE_TTL_MS) {
        return memHit.items;
      }

      // 2. AsyncStorage check
      try {
        const stored = await AsyncStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.items) {
            memoryCache.set(cacheKey, parsed);
            return parsed.items;
          }
        }
      } catch {
        // Fall through to API fetch
      }
    }

    try {
      let items: MediaItem[] = [];

      if (genreId.toUpperCase() === 'ALL') {
        items = await tmdbService.discoverMedia({
          type: format,
          page,
          sortBy: sort,
        });
      } else {
        items = await tmdbService.discoverMedia({
          type: format,
          genre: genreId.toUpperCase(),
          page,
          sortBy: sort,
        });
      }

      // If empty on page 1, fallback to mock curated items
      if (items.length === 0 && page === 1) {
        items = INITIAL_MEDIA_ITEMS.filter((it) => {
          const matchFormat =
            format === 'all'
              ? true
              : format === 'movie'
              ? it.type === 'movie'
              : format === 'tv'
              ? it.type === 'tv'
              : it.type === 'anime';
          const matchGenre = matchesGenreFallback(it.genres, genreId);
          return matchFormat && matchGenre;
        });
      }

      // Save to cache
      const payload = {
        timestamp: Date.now(),
        items,
      };
      memoryCache.set(cacheKey, payload);

      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {
        // Non-blocking
      }

      // Pre-warm runtime media cache for instant title detail opening
      tmdbService.cacheMediaItems(items);

      return items;
    } catch (err) {
      console.warn(`[GenreCatalogueService] Fetch failed for ${genreId}:`, err);
      // Fallback
      if (page === 1) {
        return INITIAL_MEDIA_ITEMS.filter((it) => {
          const matchFormat =
            format === 'all'
              ? true
              : format === 'movie'
              ? it.type === 'movie'
              : format === 'tv'
              ? it.type === 'tv'
              : it.type === 'anime';
          return matchFormat && matchesGenreFallback(it.genres, genreId);
        });
      }
      return [];
    }
  },
};
