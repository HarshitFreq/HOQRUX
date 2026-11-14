import { ExternalIds } from '../../types';

export const animeOfflineService = {
  extractIdsFromSources(sources: string[]): ExternalIds {
    const ids: ExternalIds = {};
    for (const url of sources) {
      if (url.includes('myanimelist.net/anime/')) {
        const m = url.match(/anime\/(\d+)/);
        if (m) ids.mal = parseInt(m[1], 10);
      } else if (url.includes('anilist.co/anime/')) {
        const m = url.match(/anime\/(\d+)/);
        if (m) ids.anilist = parseInt(m[1], 10);
      } else if (url.includes('kitsu.app/anime/') || url.includes('kitsu.io/anime/')) {
        const m = url.match(/anime\/([a-zA-Z0-9-]+)/);
        if (m) ids.kitsu = parseInt(m[1], 10);
      } else if (url.includes('anidb.net/anime/')) {
        const m = url.match(/anime\/(\d+)/);
        if (m) ids.anidb = parseInt(m[1], 10);
      }
    }
    return ids;
  },
};
