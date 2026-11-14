import { MediaItem } from '../../types';
import { storageService } from '../../storage';

const BASE_URL = 'https://api.myanimelist.net/v2';

interface MalItem {
  node: {
    id: number;
    title: string;
    main_picture?: {
      medium?: string;
      large?: string;
    };
    alternative_titles?: {
      en?: string;
      ja?: string;
    };
    start_date?: string;
    synopsis?: string;
    mean?: number;
    rank?: number;
    genres?: { id: number; name: string }[];
    num_episodes?: number;
    status?: string;
  };
}

export const malService = {
  async search(query: string, limit = 15): Promise<MediaItem[]> {
    try {
      const clientId = await storageService.getMalClientId();
      if (!clientId) return [];

      const res = await fetch(
        `${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}&fields=id,title,main_picture,alternative_titles,start_date,synopsis,mean,rank,genres,num_episodes,status`,
        {
          headers: {
            'X-MAL-CLIENT-ID': clientId,
          },
        }
      );
      if (!res.ok) return [];

      const json: { data: MalItem[] } = await res.json();
      return json.data.map(({ node }) => {
        const year = node.start_date ? parseInt(node.start_date.slice(0, 4), 10) : new Date().getFullYear();
        const poster = node.main_picture?.large || node.main_picture?.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';
        return {
          id: `mal-official-${node.id}`,
          tmdbId: node.id,
          title: node.alternative_titles?.en || node.title,
          originalTitle: node.alternative_titles?.ja,
          type: 'anime',
          sourceProvider: 'mal',
          externalIds: {
            mal: node.id,
          },
          posterPath: poster,
          releaseYear: isNaN(year) ? new Date().getFullYear() : year,
          overview: node.synopsis || 'No synopsis available.',
          genres: node.genres ? node.genres.map((g) => g.name) : ['Anime'],
          tmdbRating: node.mean || 8.0,
          communityRating: node.mean,
          ratingSource: 'MyAnimeList Official',
          status: node.status,
          totalEpisodes: node.num_episodes,
        };
      });
    } catch {
      return [];
    }
  },
};
