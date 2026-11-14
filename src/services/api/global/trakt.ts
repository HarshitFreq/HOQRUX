import { MediaItem } from '../../types';
import { storageService } from '../../storage';

const BASE_URL = 'https://api.trakt.tv';

interface TraktSearchResult {
  type: 'movie' | 'show';
  score: number;
  movie?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb?: string;
      tmdb?: number;
    };
    overview?: string;
    rating?: number;
  };
  show?: {
    title: string;
    year: number;
    ids: {
      trakt: number;
      slug: string;
      imdb?: string;
      tmdb?: number;
      tvdb?: number;
    };
    overview?: string;
    rating?: number;
  };
}

export const traktService = {
  async search(query: string): Promise<MediaItem[]> {
    try {
      const clientId = await storageService.getTraktClientId();
      if (!clientId) return [];

      const res = await fetch(`${BASE_URL}/search/movie,show?query=${encodeURIComponent(query)}&extended=full`, {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': clientId,
        },
      });
      if (!res.ok) return [];

      const data: TraktSearchResult[] = await res.json();
      return data.map((item) => {
        const entity = item.movie || item.show!;
        const isMovie = item.type === 'movie';
        return {
          id: `trakt-${entity.ids.trakt}`,
          tmdbId: entity.ids.tmdb || entity.ids.trakt,
          imdbId: entity.ids.imdb,
          title: entity.title,
          type: isMovie ? 'movie' : 'tv',
          sourceProvider: 'trakt',
          externalIds: {
            trakt: entity.ids.trakt,
            imdb: entity.ids.imdb,
            tmdb: entity.ids.tmdb,
            tvdb: item.show?.ids.tvdb,
          },
          posterPath: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
          releaseYear: entity.year || new Date().getFullYear(),
          overview: entity.overview || 'No synopsis available.',
          genres: ['Cinema'],
          tmdbRating: entity.rating ? Math.round(entity.rating * 10) / 10 : 7.5,
          imdbRating: entity.rating ? Math.round(entity.rating * 10) / 10 : undefined,
          ratingSource: 'Trakt.tv',
        };
      });
    } catch {
      return [];
    }
  },
};
