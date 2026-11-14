import { MediaItem } from '../../types';

export const anidbService = {
  async getAnimeData(anidbId: number): Promise<Partial<MediaItem> | null> {
    try {
      // AniDB HTTP API interface
      const res = await fetch(
        `http://api.anidb.net:9001/httpapi?request=anime&client=hoqrux&clientver=1&protover=1&aid=${anidbId}`
      );
      if (!res.ok) return null;
      const text = await res.text();
      // AniDB returns XML, extract main title
      const titleMatch = text.match(/<title type="main"[^>]*>([^<]+)<\/title>/);
      const ratingMatch = text.match(/<permanent count="[^"]*">([^<]+)<\/permanent>/);

      return {
        title: titleMatch ? titleMatch[1] : undefined,
        tmdbRating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
        externalIds: {
          anidb: anidbId,
        },
        ratingSource: 'AniDB',
      };
    } catch {
      return null;
    }
  },
};
