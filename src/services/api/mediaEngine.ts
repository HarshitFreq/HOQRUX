import { MediaItem, MediaSourceProvider } from '../types';
import { tmdbService } from '../tmdb';
import { INITIAL_MEDIA_ITEMS } from '../mockData';
import { tvmazeService } from './global/tvmaze';
import { omdbService } from './global/omdb';
import { tvdbService } from './global/thetvdb';
import { traktService } from './global/trakt';
import { simklService } from './global/simkl';
import { watchmodeService } from './global/watchmode';
import { imdbService } from './global/imdb';
import { anilistService } from './anime/anilist';
import { jikanService } from './anime/jikan';
import { kitsuService } from './anime/kitsu';
import { shikimoriService } from './anime/shikimori';
import { anidbService } from './anime/anidb';
import { malService } from './anime/mal';
import { myDramaListService } from './asian/mydramalist';
import { archiveService } from './niche/archive';
import { idMapper } from './mapping/idMapper';
import { typoCorrectionService } from '../typoCorrection';

export interface SearchOptions {
  query: string;
  category?: 'all' | 'movies' | 'series' | 'anime' | 'asian_drama' | 'classic';
  provider?: MediaSourceProvider | 'auto';
  limit?: number;
  page?: number;
  exactQuery?: boolean;
}

export interface TypoSearchResult {
  items: MediaItem[];
  correctedQuery?: string;
  isCorrected: boolean;
}

export const mediaEngine = {
  // Direct Provider Accessors
  tmdb: tmdbService,
  tvmaze: tvmazeService,
  omdb: omdbService,
  tvdb: tvdbService,
  trakt: traktService,
  simkl: simklService,
  watchmode: watchmodeService,
  imdb: imdbService,
  anilist: anilistService,
  jikan: jikanService,
  kitsu: kitsuService,
  shikimori: shikimoriService,
  anidb: anidbService,
  mal: malService,
  mydramalist: myDramaListService,
  archive: archiveService,
  idMapper,

  /**
   * Unified Search across providers based on category or target provider
   */
  async search(options: SearchOptions): Promise<MediaItem[]> {
    const { query, category = 'all', provider = 'auto', limit = 20, page = 1 } = options;
    if (!query.trim()) return [];

    // Explicit single-provider query
    if (provider !== 'auto') {
      switch (provider) {
        case 'anilist':
          return anilistService.search(query, page, limit);
        case 'jikan':
        case 'mal':
          return jikanService.search(query, limit);
        case 'kitsu':
          return kitsuService.search(query, limit);
        case 'shikimori':
          return shikimoriService.search(query, limit);
        case 'tvmaze':
          return tvmazeService.search(query);
        case 'mydramalist':
          return myDramaListService.search(query);
        case 'archive':
          return archiveService.search(query, limit, page);
        case 'thetvdb':
          return tvdbService.search(query);
        case 'trakt':
          return traktService.search(query);
        case 'simkl':
          return simklService.search(query);
        case 'tmdb':
        default:
          return tmdbService.searchMedia(query, 'all', page);
      }
    }

    // Category-specific unified routing
    if (category === 'anime') {
      const [aniResults, jikanResults] = await Promise.all([
        anilistService.search(query, page, 15).catch(() => []),
        page === 1 ? jikanService.search(query, 5).catch(() => []) : Promise.resolve([]),
      ]);
      return this.deduplicateAndEnrich([...aniResults, ...jikanResults]);
    }

    if (category === 'asian_drama') {
      const [mdlResults, tmdbResults] = await Promise.all([
        page === 1 ? myDramaListService.search(query).catch(() => []) : Promise.resolve([]),
        tmdbService.searchMedia(query, 'tv', page).catch(() => []),
      ]);
      return this.deduplicateAndEnrich([...mdlResults, ...tmdbResults]);
    }

    if (category === 'classic') {
      return archiveService.search(query, limit, page);
    }

    // Default 'all' or 'movies' / 'series'
    const filterType = category === 'movies' ? 'movie' : category === 'series' ? 'tv' : 'all';

    // Primary TMDb search + TVmaze + AniList multi-ecosystem search
    const [tmdbItems, tvmazeItems, animeItems] = await Promise.all([
      tmdbService.searchMedia(query, filterType, page).catch(() => []),
      category !== 'movies' && page === 1 ? tvmazeService.search(query).catch(() => []) : Promise.resolve([]),
      page === 1 ? anilistService.search(query, 1, 4).catch(() => []) : Promise.resolve([]),
    ]);

    const combined = [...tmdbItems, ...tvmazeItems, ...animeItems];
    return this.deduplicateAndEnrich(combined).slice(0, limit);
  },

  /**
   * Typo-Tolerant Search Pipeline:
   * First queries the raw query. If 0 items are returned, automatically computes
   * fuzzy Levenshtein & neural search suggestions, re-queries with the corrected title,
   * and reports both the items and the corrected term for transparent UI rendering.
   */
  async searchWithTypo(options: SearchOptions): Promise<TypoSearchResult> {
    const { query, exactQuery = false } = options;
    const cleanQ = query.trim();
    if (!cleanQ) return { items: [], isCorrected: false };

    // If user explicitly asked for exact literal query, search raw and return
    if (exactQuery) {
      const items = await this.search(options);
      return { items, isCorrected: false };
    }

    // Check typo correction
    try {
      const typo = await typoCorrectionService.resolveTypo(cleanQ);

      if (typo.isCorrected && typo.corrected.toLowerCase() !== cleanQ.toLowerCase()) {
        // High-confidence typo detected!
        // Search with the corrected term
        const [correctedItems, rawItems] = await Promise.all([
          this.search({ ...options, query: typo.corrected, exactQuery: true }),
          this.search({ ...options, query: cleanQ, exactQuery: true }),
        ]);

        if (
          correctedItems.length > 0 &&
          (rawItems.length === 0 || correctedItems.length >= rawItems.length)
        ) {
          return {
            items: correctedItems,
            correctedQuery: typo.corrected,
            isCorrected: true,
          };
        }

        if (rawItems.length > 0) {
          return { items: rawItems, isCorrected: false };
        }
      }
    } catch (e) {
      console.warn('Typo correction error:', e);
    }

    const rawItems = await this.search(options);
    return {
      items: rawItems,
      isCorrected: false,
    };
  },

  /**
   * Comprehensive Details & Metadata Enrichment:
   * Combines TMDb synopsis, TVmaze episodes, OMDb awards/ratings, and Watchmode streams
   */
  async getEnrichedDetails(id: string): Promise<MediaItem | null> {
    let item: MediaItem | null = null;

    // Detect provider prefix
    if (id.startsWith('tvmaze-')) {
      item = await tvmazeService.getShowDetails(id);
    } else if (id.startsWith('anilist-')) {
      const rawId = parseInt(id.replace('anilist-', ''), 10);
      if (!isNaN(rawId)) {
        item = await anilistService.getMediaById(rawId);
      }
    } else if (id.startsWith('kitsu-')) {
      item = await kitsuService.getMediaById(id.replace('kitsu-', ''));
    } else if (id.startsWith('mal-') || id.startsWith('jikan-')) {
      const rawId = parseInt(id.replace(/^(mal|jikan)-/, ''), 10);
      if (!isNaN(rawId)) {
        item = await jikanService.getMediaById(rawId);
      }
    } else if (id.startsWith('archive-')) {
      const items = await archiveService.search(id.replace('archive-', ''), 1);
      item = items[0] || null;
    } else {
      // Default to TMDb
      item = await tmdbService.getMediaDetails(id);
    }

    if (!item) {
      const local = INITIAL_MEDIA_ITEMS.find((m) => m.id === id);
      if (local) {
        item = { ...local };
        if (local.tmdbId && typeof local.tmdbId === 'number') {
          try {
            const tmdbItem = await tmdbService.getMediaDetails(`movie-${local.tmdbId}`);
            if (tmdbItem) {
              item = {
                ...item,
                ...tmdbItem,
                id: local.id,
                belongs_to_collection: tmdbItem.belongs_to_collection,
                collection: tmdbItem.collection,
              };
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    if (!item) return null;

    // Enrich cross-database IDs (Fribb / Wikidata)
    const enriched = await idMapper.enrichMediaItem(item);

    // Fetch OMDb IMDb score if missing
    if (enriched.imdbId && !enriched.imdbRating) {
      const omdbMeta = await omdbService.getMediaByImdbId(enriched.imdbId);
      if (omdbMeta?.imdbRating) {
        enriched.imdbRating = omdbMeta.imdbRating;
      }
    }

    // Fetch live streaming providers from Watchmode if available
    const tmdbIdForWatchmode = enriched.externalIds?.tmdb || (enriched.sourceProvider === 'tmdb' ? enriched.tmdbId : undefined);
    if (tmdbIdForWatchmode) {
      const watchmodeProviders = await watchmodeService.getStreamingSources(
        tmdbIdForWatchmode,
        enriched.type === 'movie' ? 'movie' : 'tv'
      );
      if (watchmodeProviders.length > 0) {
        enriched.providers = watchmodeProviders;
      }
    }

    // Ensure TV & Anime series have full multi-season episodic data for tracking & ticking
    const isSeriesItem = enriched.type === 'tv' || enriched.type === 'anime';
    if (isSeriesItem && (!enriched.seasons || enriched.seasons.length <= 1)) {
      // 1. If we have TMDb TV mapping, load all seasons and episode thumbnails
      let tmdbTvId =
        enriched.externalIds?.tmdb ||
        (typeof enriched.tmdbId === 'number' && enriched.tmdbId > 100 && enriched.sourceProvider === 'tmdb'
          ? enriched.tmdbId
          : undefined);

      if (!tmdbTvId && enriched.type === 'anime') {
        try {
          const tmdbSearch = await tmdbService.searchMedia(enriched.title, 'tv', 1);
          const animeMatch = tmdbSearch.find(
            (t) =>
              t.genres.some((g) => g.toLowerCase().includes('anim')) ||
              (t.releaseYear && Math.abs(t.releaseYear - enriched.releaseYear) <= 2)
          );
          if (animeMatch?.tmdbId) {
            tmdbTvId = animeMatch.tmdbId;
          }
        } catch {
          // ignore
        }
      }

      if (tmdbTvId) {
        try {
          const tmdbShow = await tmdbService.getMediaDetails(`tv-${tmdbTvId}`);
          if (tmdbShow?.seasons && tmdbShow.seasons.length > 0) {
            enriched.seasons = tmdbShow.seasons;
            enriched.totalEpisodes = tmdbShow.totalEpisodes || enriched.totalEpisodes;
            if (!enriched.backdropPath || enriched.backdropPath.includes('unsplash')) {
              enriched.backdropPath = tmdbShow.backdropPath;
            }
            if (!enriched.cast || enriched.cast.length === 0) {
              enriched.cast = tmdbShow.cast;
            }
          }
        } catch {
          // continue to fallback
        }
      }

      // 2. If still no seasons, try TVmaze
      if (!enriched.seasons || enriched.seasons.length === 0) {
        try {
          const tvmazeSeasons = await tvmazeService.getEpisodesByTitle(enriched.title, enriched.type === 'anime');
          if (tvmazeSeasons && tvmazeSeasons.length > (enriched.seasons?.length || 0)) {
            enriched.seasons = tvmazeSeasons;
            enriched.totalEpisodes = tvmazeSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
          }
        } catch {
          // Fallback to synthesis
        }
      }

      // 3. Fallback: synthesize clean seasons and episodes
      if (!enriched.seasons || enriched.seasons.length === 0) {
        const count = enriched.totalEpisodes || 12;
        const chunkSize = count > 50 ? 25 : count;
        const numSeasons = Math.max(1, Math.ceil(count / chunkSize));

        enriched.seasons = Array.from({ length: numSeasons }, (_, sIdx) => {
          const sNum = sIdx + 1;
          const startEp = sIdx * chunkSize + 1;
          const endEp = Math.min(count, (sIdx + 1) * chunkSize);
          const epCount = endEp - startEp + 1;
          return {
            seasonNumber: sNum,
            title: numSeasons === 1 ? 'Season 1' : `Season ${sNum} (Ep ${startEp}-${endEp})`,
            episodeCount: epCount,
            airDate: `${enriched.releaseYear}-01-01`,
            episodes: Array.from({ length: epCount }, (_, eIdx) => {
              const epNum = startEp + eIdx;
              return {
                id: `${enriched.id}-s${sNum}e${epNum}`,
                seasonNumber: sNum,
                episodeNumber: epNum,
                title: `Episode ${epNum}`,
                runtime: enriched.runtime || 24,
                airDate: `${enriched.releaseYear}`,
                overview: `Episode ${epNum} of ${enriched.title}.`,
                stillPath: enriched.backdropPath || enriched.posterPath,
              };
            }),
          };
        });
        enriched.totalEpisodes = count;
      }
    }

    // Enrich franchise & collection order for movies
    if (enriched.type === 'movie' && !enriched.collection) {
      const colId = enriched.belongs_to_collection?.id;
      if (colId) {
        try {
          const collectionInfo = await tmdbService.getCollection(colId);
          if (collectionInfo) {
            enriched.collection = collectionInfo;
          }
        } catch (colErr) {
          console.warn('Failed to load collection for movie:', colErr);
        }
      } else if (enriched.tmdbId && typeof enriched.tmdbId === 'number') {
        try {
          const tmdbDetails = await tmdbService.getMediaDetails(`movie-${enriched.tmdbId}`);
          if (tmdbDetails?.collection) {
            enriched.collection = tmdbDetails.collection;
            enriched.belongs_to_collection = tmdbDetails.belongs_to_collection;
          }
        } catch {
          // Ignore
        }
      }
    }

    return enriched;
  },

  /**
   * Deduplicate items across providers by ID, TMDb ID, IMDb ID, and normalized title + year
   */
  deduplicateAndEnrich(items: MediaItem[]): MediaItem[] {
    const seenIds = new Set<string>();
    const seenTmdb = new Set<number>();
    const seenImdb = new Set<string>();
    const seenTitles = new Set<string>();
    const out: MediaItem[] = [];

    for (const it of items) {
      if (!it || !it.id || !it.title) continue;

      if (seenIds.has(it.id)) continue;

      if (it.tmdbId && it.tmdbId > 0 && it.sourceProvider === 'tmdb' && seenTmdb.has(it.tmdbId)) {
        continue;
      }

      if (it.imdbId && seenImdb.has(it.imdbId)) {
        continue;
      }

      const normTitle = it.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const typeKey = it.type === 'movie' ? 'm' : 's';
      const titleKey = `${typeKey}_${normTitle}_${it.releaseYear || ''}`;

      if (seenTitles.has(titleKey)) {
        continue;
      }

      seenIds.add(it.id);
      if (it.tmdbId && it.tmdbId > 0 && it.sourceProvider === 'tmdb') {
        seenTmdb.add(it.tmdbId);
      }
      if (it.imdbId) seenImdb.add(it.imdbId);
      seenTitles.add(titleKey);

      out.push(it);
    }

    return out;
  },
};
