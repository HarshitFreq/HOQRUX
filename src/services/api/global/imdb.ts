import { MediaItem } from '../../types';
import { storageService } from '../../storage';

export const imdbService = {
  async getTitleData(imdbId: string): Promise<Partial<MediaItem> | null> {
    try {
      const apiKey = await storageService.getImdbKey();
      if (!apiKey) return null;

      const res = await fetch(`https://imdb-api.projects.erd.aws/title/${imdbId}`, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) return null;

      const data: { id: string; title: string; year: number; rating: number } = await res.json();
      return {
        imdbId: data.id,
        imdbRating: data.rating,
        releaseYear: data.year,
      };
    } catch {
      return null;
    }
  },
};
