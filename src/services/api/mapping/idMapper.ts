import { MediaItem, ExternalIds } from '../../types';
import { fribbService } from './fribbAnime';
import { wikidataService } from '../niche/wikidata';

export const idMapper = {
  async enrichMediaItem(item: MediaItem): Promise<MediaItem> {
    let resolved: ExternalIds = { ...(item.externalIds || {}) };

    // 1. If it's an anime, check Fribb mappings
    if (item.type === 'anime' || item.sourceProvider === 'anilist' || item.sourceProvider === 'jikan') {
      const fribbMatch = await fribbService.findMappings({
        anilistId: resolved.anilist,
        malId: resolved.mal,
        tmdbId: resolved.tmdb || item.tmdbId,
        imdbId: resolved.imdb || item.imdbId,
      });

      if (fribbMatch) {
        resolved = { ...resolved, ...fribbMatch };
      }
    }

    // 2. If we have an IMDb ID, resolve Wikidata & other IDs
    const currentImdb = resolved.imdb || item.imdbId;
    if (currentImdb) {
      const wikiMatch = await wikidataService.resolveExternalIdsByImdb(currentImdb);
      if (wikiMatch) {
        resolved = { ...resolved, ...wikiMatch };
      }
    }

    return {
      ...item,
      tmdbId: resolved.tmdb || item.tmdbId,
      imdbId: resolved.imdb || item.imdbId,
      externalIds: resolved,
    };
  },
};
