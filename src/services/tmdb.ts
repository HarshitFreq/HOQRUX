import AsyncStorage from '@react-native-async-storage/async-storage';
import { MediaItem, StreamingProvider, CollectionInfo, CollectionPart } from './types';
import { INITIAL_MEDIA_ITEMS } from './mockData';
import { storageService } from './storage';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_KEY = '1cf50e6248dc270629e802686245c2c8';

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

const GENRE_NAME_TO_TMDB_ID: Record<string, { movie?: number; tv?: number }> = {
  ACTION: { movie: 28, tv: 10759 },
  ADVENTURE: { movie: 12, tv: 10759 },
  ANIMATION: { movie: 16, tv: 16 },
  ANIME: { movie: 16, tv: 16 },
  COMEDY: { movie: 35, tv: 35 },
  CRIME: { movie: 80, tv: 80 },
  DOCUMENTARY: { movie: 99, tv: 99 },
  DRAMA: { movie: 18, tv: 18 },
  FAMILY: { movie: 10751, tv: 10762 },
  FANTASY: { movie: 14, tv: 10765 },
  HISTORY: { movie: 36, tv: 36 },
  HISTORICAL: { movie: 36, tv: 36 },
  HORROR: { movie: 27, tv: 27 },
  MUSIC: { movie: 10402, tv: 10402 },
  MYSTERY: { movie: 9648, tv: 9648 },
  ROMANCE: { movie: 10749, tv: 10749 },
  'SCI-FI': { movie: 878, tv: 10765 },
  THRILLER: { movie: 53, tv: 53 },
  WAR: { movie: 10752, tv: 10768 },
  WESTERN: { movie: 37, tv: 37 },
  MELODRAMA: { movie: 18, tv: 18 },
  BIOGRAPHY: { movie: 36, tv: 36 },
  NOIR: { movie: 80, tv: 80 },
};

// Cache for runtime fetched items and searches
const runtimeMediaCache: Map<string, MediaItem> = new Map();
const searchResultsCache: Map<string, MediaItem[]> = new Map();

// Initialize cache with mock items
INITIAL_MEDIA_ITEMS.forEach(item => {
  runtimeMediaCache.set(item.id, item);
});

async function fetchWithTimeout(url: string, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export const tmdbService = {
  async getActiveApiKey(): Promise<string> {
    const userKey = await storageService.getTmdbKey();
    return (userKey && userKey.trim().length > 0) ? userKey.trim() : DEFAULT_TMDB_KEY;
  },

  async getTrending(type: 'all' | 'movie' | 'tv' = 'all', page = 1): Promise<MediaItem[]> {
    const apiKey = await this.getActiveApiKey();
    if (apiKey) {
      try {
        const url = `${TMDB_API_BASE}/trending/${type === 'all' ? 'all' : type}/week?api_key=${apiKey}&page=${page}`;
        const res = await fetchWithTimeout(url).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          const items: MediaItem[] = data.results
            .filter((r: any) => r.media_type !== 'person')
            .map((r: any) => formatTmdbResult(r));
          items.forEach(it => runtimeMediaCache.set(it.id, it));
          return items;
        }
      } catch (e) {
        console.warn('TMDB API error, falling back to curated collection:', e);
      }
    }

    // Curated catalog fallback (only for page 1)
    if (page > 1) return [];
    if (type === 'all') return INITIAL_MEDIA_ITEMS;
    return INITIAL_MEDIA_ITEMS.filter(it => it.type === type);
  },

  async discoverMedia(options: {
    type?: 'movie' | 'tv' | 'all';
    genre?: string;
    page?: number;
    sortBy?: 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';
    withoutGenres?: number[];
    originCountry?: string;
    language?: string;
  }): Promise<MediaItem[]> {
    const {
      type = 'all',
      genre,
      page = 1,
      sortBy = 'popularity.desc',
      withoutGenres,
      originCountry,
      language,
    } = options;
    const apiKey = await this.getActiveApiKey();
    if (!apiKey) return [];

    const isAnime = genre?.toUpperCase() === 'ANIME';

    try {
      if (type === 'all') {
        const movieGenreId = genre ? GENRE_NAME_TO_TMDB_ID[genre.toUpperCase()]?.movie : undefined;
        const tvGenreId = genre ? GENRE_NAME_TO_TMDB_ID[genre.toUpperCase()]?.tv : undefined;

        let movieUrl = `${TMDB_API_BASE}/discover/movie?api_key=${apiKey}&sort_by=${sortBy}&page=${page}`;
        if (sortBy === 'vote_average.desc') movieUrl += '&vote_count.gte=100';
        if (movieGenreId) movieUrl += `&with_genres=${movieGenreId}`;
        if (isAnime) movieUrl += '&with_original_language=ja';
        if (language) movieUrl += `&with_original_language=${language}`;

        let tvUrl = `${TMDB_API_BASE}/discover/tv?api_key=${apiKey}&sort_by=${sortBy}&page=${page}`;
        if (sortBy === 'vote_average.desc') tvUrl += '&vote_count.gte=50';
        if (tvGenreId) tvUrl += `&with_genres=${tvGenreId}`;
        if (isAnime) tvUrl += '&with_original_language=ja';
        if (language) tvUrl += `&with_original_language=${language}`;

        const [movieRes, tvRes] = await Promise.all([
          fetchWithTimeout(movieUrl)
            .then((r) => (r.ok ? r.json() : { results: [] }))
            .catch(() => ({ results: [] })),
          fetchWithTimeout(tvUrl)
            .then((r) => (r.ok ? r.json() : { results: [] }))
            .catch(() => ({ results: [] })),
        ]);

        const movies: MediaItem[] = (movieRes.results || [])
          .filter((r: any) => r.media_type !== 'person')
          .map((r: any) => formatTmdbResult({ ...r, media_type: 'movie' }));
        const tvs: MediaItem[] = (tvRes.results || [])
          .filter((r: any) => r.media_type !== 'person')
          .map((r: any) => formatTmdbResult({ ...r, media_type: 'tv' }));

        const interleaved: MediaItem[] = [];
        const maxLen = Math.max(movies.length, tvs.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < movies.length) interleaved.push(movies[i]);
          if (i < tvs.length) interleaved.push(tvs[i]);
        }
        interleaved.forEach((it) => runtimeMediaCache.set(it.id, it));
        return interleaved;
      }

      const targetType = type === 'movie' ? 'movie' : 'tv';
      let url = `${TMDB_API_BASE}/discover/${targetType}?api_key=${apiKey}&sort_by=${sortBy}&page=${page}`;
      if (sortBy === 'vote_average.desc') {
        url += targetType === 'movie' ? '&vote_count.gte=100' : '&vote_count.gte=50';
      }
      if (genre) {
        const genreId = GENRE_NAME_TO_TMDB_ID[genre.toUpperCase()]?.[targetType];
        if (genreId) url += `&with_genres=${genreId}`;
      }
      if (isAnime) {
        url += '&with_original_language=ja';
      }
      if (language) {
        url += `&with_original_language=${language}`;
      }
      if (withoutGenres && withoutGenres.length > 0) {
        url += `&without_genres=${withoutGenres.join(',')}`;
      }
      if (originCountry) {
        url += `&with_origin_country=${encodeURIComponent(originCountry)}`;
      }

      const res = await fetchWithTimeout(url).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const items: MediaItem[] = (data.results || [])
          .filter((r: any) => r.media_type !== 'person')
          .map((r: any) => formatTmdbResult({ ...r, media_type: targetType }));
        items.forEach((it) => runtimeMediaCache.set(it.id, it));
        return items;
      }
    } catch (e) {
      console.warn('TMDB discover error:', e);
    }
    return [];
  },

  async searchMedia(query: string, type: 'all' | 'movie' | 'tv' = 'all', page = 1): Promise<MediaItem[]> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const cacheKey = `${type}:${cleanQuery}:${page}`;
    if (searchResultsCache.has(cacheKey)) {
      return searchResultsCache.get(cacheKey)!;
    }

    const apiKey = await this.getActiveApiKey();
    if (apiKey) {
      try {
        const endpoint = type === 'all' ? 'search/multi' : `search/${type}`;
        const url = `${TMDB_API_BASE}/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(cleanQuery)}&page=${page}`;
        const res = await fetchWithTimeout(url).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          const liveItems: MediaItem[] = data.results
            .filter((r: any) => r.media_type !== 'person')
            .map((r: any) => formatTmdbResult(r));
          liveItems.forEach(it => runtimeMediaCache.set(it.id, it));
          if (liveItems.length > 0) {
            searchResultsCache.set(cacheKey, liveItems);
            return liveItems;
          }
        }
      } catch (e) {
        console.warn('TMDB search error, filtering local items', e);
      }
    }

    if (page > 1) return [];

    // Local / curated matching
    const localMatches = INITIAL_MEDIA_ITEMS.filter(item => {
      const matchType = type === 'all' || item.type === type;
      const matchText =
        item.title.toLowerCase().includes(cleanQuery) ||
        item.genres.some(g => g.toLowerCase().includes(cleanQuery)) ||
        (item.cast && item.cast.some(c => c.name.toLowerCase().includes(cleanQuery))) ||
        (item.directors && item.directors.some(d => d.toLowerCase().includes(cleanQuery)));
      return matchType && matchText;
    });

    searchResultsCache.set(cacheKey, localMatches);
    return localMatches;
  },

  async getMediaDetails(id: string): Promise<MediaItem | null> {
    if (runtimeMediaCache.has(id)) {
      const cached = runtimeMediaCache.get(id)!;
      if (cached.type !== 'tv' || (cached.seasons && cached.seasons.length > 0)) {
        return cached;
      }
    }

    const apiKey = await this.getActiveApiKey();
    if (apiKey) {
      // Determine if ID is tmdb numeric or formatted
      const isTv = id.startsWith('tv-');
      const isMovie = id.startsWith('movie-');
      const mediaType = isTv ? 'tv' : isMovie ? 'movie' : 'movie';
      let cleanId = id.replace(/^(tv|movie)-/, '');

      // If cleanId is not purely numeric, resolve from mock items or media cache
      if (!/^\d+$/.test(cleanId)) {
        const local = INITIAL_MEDIA_ITEMS.find((m) => m.id === id);
        if (local?.tmdbId) {
          cleanId = String(local.tmdbId);
        }
      }

      try {
        const url = `${TMDB_API_BASE}/${mediaType}/${cleanId}?api_key=${apiKey}&append_to_response=credits,videos,watch/providers`;
        const res = await fetchWithTimeout(url).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          const item = formatTmdbDetails(data, mediaType);
          
          // If TV show, fetch episodes for all available seasons
          if (mediaType === 'tv') {
            const rawSeasons: any[] = (data.seasons || []).filter((s: any) => s.season_number > 0);
            const numSeasons = data.number_of_seasons || rawSeasons.length || 1;

            const seasonsToFetch = rawSeasons.length > 0
              ? rawSeasons.slice(0, 10)
              : Array.from({ length: Math.min(numSeasons, 10) }, (_, i) => ({
                  season_number: i + 1,
                  name: `Season ${i + 1}`,
                  episode_count: 10,
                }));

            try {
              const fetchedSeasons = await Promise.all(
                seasonsToFetch.map(async (sMeta: any) => {
                  const sNum = sMeta.season_number;
                  try {
                    const sRes = await fetchWithTimeout(`${TMDB_API_BASE}/tv/${cleanId}/season/${sNum}?api_key=${apiKey}`).catch(() => null);
                    if (sRes && sRes.ok) {
                      const sData = await sRes.json();
                      return {
                        seasonNumber: sNum,
                        title: sData.name || `Season ${sNum}`,
                        episodeCount: sData.episodes?.length || sMeta.episode_count || 0,
                        airDate: sData.air_date || sMeta.air_date || '',
                        episodes: (sData.episodes || []).map((ep: any) => ({
                          id: `${item.id}-s${sNum}e${ep.episode_number}`,
                          episodeNumber: ep.episode_number,
                          seasonNumber: sNum,
                          title: ep.name || `Episode ${ep.episode_number}`,
                          overview: ep.overview,
                          runtime: ep.runtime || item.runtime || 45,
                          airDate: ep.air_date,
                          stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
                          rating: ep.vote_average,
                        })),
                      };
                    }
                  } catch {
                    // Fallback
                  }

                  const epCount = sMeta.episode_count || 10;
                  return {
                    seasonNumber: sNum,
                    title: sMeta.name || `Season ${sNum}`,
                    episodeCount: epCount,
                    airDate: sMeta.air_date || '',
                    episodes: Array.from({ length: epCount }, (_, idx) => ({
                      id: `${item.id}-s${sNum}e${idx + 1}`,
                      episodeNumber: idx + 1,
                      seasonNumber: sNum,
                      title: `Episode ${idx + 1}`,
                      runtime: item.runtime || 45,
                      overview: `Episode ${idx + 1} of Season ${sNum}`,
                      stillPath: item.backdropPath || item.posterPath,
                    })),
                  };
                })
              );

              // Include remaining seasons beyond the initial 10 so the user has full access to every season
              const remainingMeta = rawSeasons.length > 10 ? rawSeasons.slice(10) : [];
              const remainingSeasons = remainingMeta.map((sMeta: any) => {
                const sNum = sMeta.season_number;
                const epCount = sMeta.episode_count || 10;
                return {
                  seasonNumber: sNum,
                  title: sMeta.name || `Season ${sNum}`,
                  episodeCount: epCount,
                  airDate: sMeta.air_date || '',
                  posterPath: sMeta.poster_path ? `https://image.tmdb.org/t/p/w500${sMeta.poster_path}` : undefined,
                  episodes: Array.from({ length: epCount }, (_, idx) => ({
                    id: `${item.id}-s${sNum}e${idx + 1}`,
                    episodeNumber: idx + 1,
                    seasonNumber: sNum,
                    title: `Episode ${idx + 1}`,
                    runtime: item.runtime || 45,
                    overview: `Episode ${idx + 1} of Season ${sNum}`,
                    stillPath: sMeta.poster_path
                      ? `https://image.tmdb.org/t/p/w500${sMeta.poster_path}`
                      : (item.backdropPath || item.posterPath),
                  })),
                };
              });

              const allSeasons = [...fetchedSeasons, ...remainingSeasons];
              item.seasons = allSeasons;
              item.totalEpisodes = allSeasons.reduce((acc, s) => acc + s.episodeCount, 0);
            } catch (epError) {
              console.warn('Failed to load season details:', epError);
            }
          }

          // If Movie belongs to a collection, fetch and cache collection timeline info
          if (item.belongs_to_collection?.id) {
            try {
              const collectionInfo = await this.getCollection(item.belongs_to_collection.id);
              if (collectionInfo) {
                item.collection = collectionInfo;
              }
            } catch (colErr) {
              console.warn('Failed to load collection details:', colErr);
            }
          }

          runtimeMediaCache.set(item.id, item);
          return item;
        }
      } catch (e) {
        console.warn('Failed to fetch TMDB details:', e);
      }
    }

    return null;
  },

  async getSeasonEpisodes(tvId: string | number, seasonNumber: number) {
    const apiKey = await this.getActiveApiKey();
    if (!apiKey) return null;
    const cleanId = String(tvId).replace(/^(tv|movie)-/, '');
    try {
      const sRes = await fetchWithTimeout(`${TMDB_API_BASE}/tv/${cleanId}/season/${seasonNumber}?api_key=${apiKey}`).catch(() => null);
      if (!sRes || !sRes.ok) return null;
      const sData = await sRes.json();
      return (sData.episodes || []).map((ep: any) => ({
        id: `tv-${cleanId}-s${seasonNumber}e${ep.episode_number}`,
        episodeNumber: ep.episode_number,
        seasonNumber,
        title: ep.name || `Episode ${ep.episode_number}`,
        overview: ep.overview,
        runtime: ep.runtime || 45,
        airDate: ep.air_date,
        stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
        rating: ep.vote_average,
      }));
    } catch {
      return null;
    }
  },

  cacheMediaItems(items: MediaItem[]): void {
    items.forEach(it => runtimeMediaCache.set(it.id, it));
  },

  getCachedItem(id: string): MediaItem | undefined {
    if (runtimeMediaCache.has(id)) return runtimeMediaCache.get(id);
    const bareId = id.replace(/^(tv|movie|anime)-/, '');
    if (runtimeMediaCache.has(`tv-${bareId}`)) return runtimeMediaCache.get(`tv-${bareId}`);
    if (runtimeMediaCache.has(`movie-${bareId}`)) return runtimeMediaCache.get(`movie-${bareId}`);
    if (runtimeMediaCache.has(`anime-${bareId}`)) return runtimeMediaCache.get(`anime-${bareId}`);
    if (runtimeMediaCache.has(bareId)) return runtimeMediaCache.get(bareId);
    return undefined;
  },

  /**
   * Fetches franchise collection details with 30-min local cache and chronological sorting.
   * Marks unreleased future sequels with isComingSoon.
   */
  async getCollection(collectionId: number): Promise<CollectionInfo | null> {
    const cacheKey = `@hoqrux_collection_${collectionId}`;
    const TTL_MS = 30 * 60 * 1000; // 30 minutes cache TTL

    // 1. Check local storage cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < TTL_MS && parsed.data) {
          return parsed.data;
        }
      }
    } catch {
      // Ignore cache read error
    }

    const apiKey = await this.getActiveApiKey();
    if (!apiKey) return null;

    try {
      const url = `${TMDB_API_BASE}/collection/${collectionId}?api_key=${apiKey}`;
      const res = await fetchWithTimeout(url).catch(() => null);
      if (!res || !res.ok) return null;

      const data = await res.json();
      const rawParts: any[] = Array.isArray(data.parts) ? data.parts : [];

      // Sort chronologically by release_date ascending (empty/future at end)
      const sortedRaw = [...rawParts].sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date).getTime() : NaN;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : NaN;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      });

      const parts: CollectionPart[] = sortedRaw.map((p, idx) => {
        const relDate = p.release_date || '';
        const relTime = relDate ? new Date(relDate).getTime() : NaN;
        const isComingSoon = !relDate || isNaN(relTime) || relTime > Date.now();
        const relYear = relDate && !isNaN(relTime) ? new Date(relDate).getFullYear() : undefined;

        return {
          id: p.id,
          title: p.title || p.original_title || 'Untitled',
          posterPath: p.poster_path ? `${TMDB_IMAGE_BASE}w185${p.poster_path}` : undefined,
          backdropPath: p.backdrop_path ? `${TMDB_IMAGE_BASE}w780${p.backdrop_path}` : undefined,
          releaseDate: relDate,
          releaseYear: relYear,
          isComingSoon,
          orderIndex: idx + 1,
          overview: p.overview,
          voteAverage: p.vote_average ? Math.round(p.vote_average * 10) / 10 : undefined,
        };
      });

      const collectionInfo: CollectionInfo = {
        id: data.id,
        name: data.name,
        overview: data.overview,
        posterPath: data.poster_path ? `${TMDB_IMAGE_BASE}w500${data.poster_path}` : undefined,
        backdropPath: data.backdrop_path ? `${TMDB_IMAGE_BASE}w1280${data.backdrop_path}` : undefined,
        parts,
      };

      // Cache locally for 30 minutes
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: Date.now(), data: collectionInfo })
        );
      } catch {
        // Ignore cache write error
      }

      return collectionInfo;
    } catch (e) {
      console.warn('[TMDb] Failed to fetch collection:', e);
      return null;
    }
  },

  // Helper to generate streaming links if none exist
  generateFallbackProviders(title: string): StreamingProvider[] {
    const encoded = encodeURIComponent(title);
    return [
      {
        id: 'netflix',
        name: 'Netflix',
        type: 'stream',
        webUrl: `https://www.netflix.com/search?q=${encoded}`,
        badgeColor: '#E50914',
      },
      {
        id: 'prime',
        name: 'Prime Video',
        type: 'rent',
        webUrl: `https://www.amazon.com/s?k=${encoded}+movie`,
        badgeColor: '#00A8E1',
      },
      {
        id: 'apple',
        name: 'Apple TV',
        type: 'buy',
        webUrl: `https://tv.apple.com/search?term=${encoded}`,
        badgeColor: '#000000',
      },
    ];
  },
};

function formatTmdbResult(r: any): MediaItem {
  const isMovie = r.media_type === 'movie' || Boolean(r.title);
  const type = isMovie ? 'movie' : 'tv';
  const id = `${type}-${r.id}`;
  const releaseDate = r.release_date || r.first_air_date || '2024-01-01';
  const releaseYear = parseInt(releaseDate.slice(0, 4), 10) || 2024;

  const resolvedGenres: string[] = Array.isArray(r.genre_ids) && r.genre_ids.length > 0
    ? r.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean)
    : (Array.isArray(r.genres) ? r.genres.map((g: any) => typeof g === 'string' ? g : g.name).filter(Boolean) : []);

  const isJapaneseAnimation =
    (r.original_language === 'ja' || (Array.isArray(r.origin_country) && r.origin_country.includes('JP'))) &&
    (resolvedGenres.some((g) => /anim/i.test(g)) || (Array.isArray(r.genre_ids) && r.genre_ids.includes(16)));

  const baseGenres = resolvedGenres.length > 0
    ? resolvedGenres
    : [type === 'movie' ? 'Film' : 'Series'];

  const genres = isJapaneseAnimation && !baseGenres.some((g) => /anime/i.test(g))
    ? ['Anime', ...baseGenres]
    : baseGenres;

  return {
    id,
    tmdbId: r.id,
    title: r.title || r.name || 'Untitled',
    originalTitle: r.original_title || r.original_name,
    originalLanguage: r.original_language,
    type: isJapaneseAnimation ? 'anime' : type,
    posterPath: r.poster_path ? `${TMDB_IMAGE_BASE}w780${r.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
    backdropPath: r.backdrop_path ? `${TMDB_IMAGE_BASE}w1280${r.backdrop_path}` : undefined,
    releaseYear,
    overview: r.overview || 'No synopsis available.',
    genres,
    tmdbRating: Math.round((r.vote_average || 7.5) * 10) / 10,
    imdbRating: Math.round(((r.vote_average || 7.5) + 0.2) * 10) / 10,
    runtime: type === 'movie' ? 120 : 50,
  };
}

function formatTmdbDetails(d: any, mediaType: 'movie' | 'tv'): MediaItem {
  const isMovie = mediaType === 'movie';
  const id = `${mediaType}-${d.id}`;
  const releaseDate = d.release_date || d.first_air_date || '2024-01-01';
  const releaseYear = parseInt(releaseDate.slice(0, 4), 10) || 2024;

  const providers: StreamingProvider[] = [];
  const usProviders = d['watch/providers']?.results?.US;
  if (usProviders?.flatrate) {
    usProviders.flatrate.slice(0, 3).forEach((p: any) => {
      providers.push({
        id: `p-${p.provider_id}`,
        name: p.provider_name,
        type: 'stream',
        webUrl: usProviders.link || `https://www.google.com/search?q=watch+${encodeURIComponent(d.title || d.name)}`,
        badgeColor: '#1A1A24',
      });
    });
  }

  const directors = isMovie
    ? (d.credits?.crew || []).filter((c: any) => c.job === 'Director').map((c: any) => c.name)
    : (d.created_by || []).map((c: any) => c.name);

  const composer = (d.credits?.crew || []).find(
    (c: any) =>
      c.job === 'Original Music Composer' ||
      c.job === 'Music' ||
      (c.department === 'Sound' && (c.job?.includes('Music') || c.job?.includes('Composer')))
  )?.name;

  const cast = (d.credits?.cast || []).slice(0, 5).map((c: any) => ({
    name: c.name,
    character: c.character,
  }));

  let trailerKey: string | undefined;
  let trailerUrl: string | undefined;
  if (d.videos?.results && Array.isArray(d.videos.results)) {
    const ytVideos = d.videos.results.filter((v: any) => v.site === 'YouTube');
    const bestTrailer =
      ytVideos.find((v: any) => v.type === 'Trailer' && v.official) ||
      ytVideos.find((v: any) => v.type === 'Trailer') ||
      ytVideos.find((v: any) => v.type === 'Teaser' && v.official) ||
      ytVideos.find((v: any) => v.type === 'Teaser') ||
      ytVideos[0];
    if (bestTrailer?.key) {
      trailerKey = bestTrailer.key;
      trailerUrl = `https://www.youtube.com/watch?v=${bestTrailer.key}`;
    }
  }

  const belongs_to_collection = d.belongs_to_collection
    ? {
        id: d.belongs_to_collection.id,
        name: d.belongs_to_collection.name,
        poster_path: d.belongs_to_collection.poster_path,
        backdrop_path: d.belongs_to_collection.backdrop_path,
      }
    : null;

  const isJapaneseAnimation =
    (d.original_language === 'ja' || (Array.isArray(d.origin_country) && d.origin_country.includes('JP'))) &&
    (d.genres || []).some((g: any) => /anim/i.test(g.name || g));

  const rawGenres = (d.genres || []).map((g: any) => g.name);
  const genres = isJapaneseAnimation && !rawGenres.some((g: string) => /anime/i.test(g))
    ? ['Anime', ...rawGenres]
    : rawGenres;

  return {
    id,
    tmdbId: d.id,
    imdbId: d.imdb_id,
    title: d.title || d.name,
    originalTitle: d.original_title || d.original_name,
    originalLanguage: d.original_language,
    type: isJapaneseAnimation ? 'anime' : mediaType,
    posterPath: d.poster_path ? `${TMDB_IMAGE_BASE}w780${d.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
    backdropPath: d.backdrop_path ? `${TMDB_IMAGE_BASE}w1280${d.backdrop_path}` : undefined,
    releaseYear,
    overview: d.overview,
    genres,
    tmdbRating: Math.round((d.vote_average || 7.5) * 10) / 10,
    imdbRating: Math.round(((d.vote_average || 7.5) + 0.2) * 10) / 10,
    runtime: isMovie ? d.runtime : (d.episode_run_time?.[0] || 50),
    directors,
    composer,
    cast,
    providers: providers.length > 0 ? providers : tmdbService.generateFallbackProviders(d.title || d.name),
    totalEpisodes: !isMovie ? d.number_of_episodes : undefined,
    trailerKey,
    trailerUrl,
    belongs_to_collection,
  };
}
