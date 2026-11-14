import { MediaItem } from '../../types';
import { storageService } from '../../storage';

const BASE_URL = 'https://api.simkl.com';

interface SimklItem {
  title: string;
  year?: number;
  type: 'movie' | 'tv' | 'anime';
  ids: {
    simkl: number;
    slug?: string;
    imdb?: string;
    tmdb?: string;
    tvdb?: string;
    mal?: string;
    anilist?: string;
  };
  poster?: string;
  overview?: string;
  ratings?: {
    simkl?: { rating?: number };
    imdb?: { rating?: number };
    mal?: { rating?: number };
  };
}

export const simklService = {
  async search(query: string): Promise<MediaItem[]> {
    try {
      const clientId = await storageService.getSimklClientId();
      if (!clientId) return [];

      const res = await fetch(`${BASE_URL}/search/text?q=${encodeURIComponent(query)}&extended=full`, {
        headers: {
          'Content-Type': 'application/json',
          'simkl-api-key': clientId,
        },
      });
      if (!res.ok) return [];

      const data: SimklItem[] = await res.json();
      return data.map((item) => {
        const rating = item.ratings?.simkl?.rating || item.ratings?.imdb?.rating || 7.5;
        const poster = item.poster
          ? `https://simkl.in/posters/${item.poster}_m.jpg`
          : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500';

        return {
          id: `simkl-${item.ids.simkl}`,
          tmdbId: item.ids.tmdb ? parseInt(item.ids.tmdb, 10) : item.ids.simkl,
          imdbId: item.ids.imdb,
          title: item.title,
          type: item.type === 'movie' ? 'movie' : 'tv',
          sourceProvider: 'simkl',
          externalIds: {
            simkl: item.ids.simkl,
            imdb: item.ids.imdb,
            tmdb: item.ids.tmdb ? parseInt(item.ids.tmdb, 10) : undefined,
            tvdb: item.ids.tvdb ? parseInt(item.ids.tvdb, 10) : undefined,
            mal: item.ids.mal ? parseInt(item.ids.mal, 10) : undefined,
            anilist: item.ids.anilist ? parseInt(item.ids.anilist, 10) : undefined,
          },
          posterPath: poster,
          releaseYear: item.year || new Date().getFullYear(),
          overview: item.overview || 'No synopsis available.',
          genres: ['Cinema'],
          tmdbRating: Math.round(rating * 10) / 10,
          imdbRating: item.ratings?.imdb?.rating,
          ratingSource: 'Simkl',
        };
      });
    } catch {
      return [];
    }
  },
};
