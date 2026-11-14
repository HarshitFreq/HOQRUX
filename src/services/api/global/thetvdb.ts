import { MediaItem } from '../../types';
import { storageService } from '../../storage';

const BASE_URL = 'https://api4.thetvdb.com/v4';

interface TVDBSearchResult {
  objectID?: string;
  name?: string;
  image_url?: string;
  year?: string;
  type?: 'series' | 'movie';
  overview?: string;
  primary_language?: string;
  tvdb_id?: string;
}

export const tvdbService = {
  async search(query: string): Promise<MediaItem[]> {
    try {
      const apiKey = await storageService.getTvdbKey();
      if (!apiKey) return [];

      const res = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return [];

      const data: { data: TVDBSearchResult[] } = await res.json();
      if (!data.data) return [];

      return data.data.map((item) => {
        const idNum = parseInt(item.tvdb_id || '0', 10);
        const year = item.year ? parseInt(item.year, 10) : new Date().getFullYear();
        return {
          id: `tvdb-${item.tvdb_id}`,
          tmdbId: idNum,
          title: item.name || 'Untitled',
          type: item.type === 'movie' ? 'movie' : 'tv',
          sourceProvider: 'thetvdb',
          externalIds: {
            tvdb: idNum,
          },
          posterPath: item.image_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
          releaseYear: isNaN(year) ? new Date().getFullYear() : year,
          overview: item.overview || 'No overview available.',
          genres: ['Drama'],
          tmdbRating: 7.5,
          ratingSource: 'TheTVDB',
        };
      });
    } catch {
      return [];
    }
  },
};
