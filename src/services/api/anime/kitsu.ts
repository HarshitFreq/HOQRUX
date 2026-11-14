import { MediaItem } from '../../types';

const BASE_URL = 'https://kitsu.io/api/edge';

interface KitsuAnime {
  id: string;
  type: string;
  attributes: {
    canonicalTitle: string;
    titles?: {
      en?: string;
      en_jp?: string;
      ja_jp?: string;
    };
    synopsis?: string;
    averageRating?: string;
    startDate?: string;
    posterImage?: {
      large?: string;
      original?: string;
      medium?: string;
    };
    coverImage?: {
      large?: string;
      original?: string;
    };
    episodeCount?: number;
    episodeLength?: number;
    status?: string;
  };
}

function transformKitsu(item: KitsuAnime): MediaItem {
  const attrs = item.attributes;
  const title = attrs.titles?.en || attrs.canonicalTitle || 'Untitled';
  const poster = attrs.posterImage?.large || attrs.posterImage?.original || attrs.posterImage?.medium || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';
  const year = attrs.startDate ? parseInt(attrs.startDate.slice(0, 4), 10) : new Date().getFullYear();
  const rawScore = attrs.averageRating ? parseFloat(attrs.averageRating) / 10 : 8.0;
  const rating = Math.round(rawScore * 10) / 10;
  const numericId = parseInt(item.id, 10);

  return {
    id: `kitsu-${item.id}`,
    title,
    originalTitle: attrs.titles?.ja_jp || attrs.titles?.en_jp,
    type: 'anime',
    sourceProvider: 'kitsu',
    externalIds: {
      kitsu: isNaN(numericId) ? undefined : numericId,
    },
    posterPath: poster,
    backdropPath: attrs.coverImage?.large || attrs.coverImage?.original || poster,
    releaseYear: isNaN(year) ? new Date().getFullYear() : year,
    overview: attrs.synopsis || 'No synopsis provided.',
    genres: ['Anime'],
    tmdbRating: rating,
    imdbRating: rating,
    communityRating: rating,
    ratingSource: 'Kitsu',
    runtime: attrs.episodeLength || 24,
    status: attrs.status,
    totalEpisodes: attrs.episodeCount,
  };
}

export const kitsuService = {
  async getMediaById(id: string | number): Promise<MediaItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/anime/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json: { data?: KitsuAnime } = await res.json();
      if (!json.data) return null;
      return transformKitsu(json.data);
    } catch {
      return null;
    }
  },

  async search(query: string, limit = 15): Promise<MediaItem[]> {
    try {
      const res = await fetch(
        `${BASE_URL}/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`
      );
      if (!res.ok) return [];
      const json: { data: KitsuAnime[] } = await res.json();
      return json.data.map(transformKitsu);
    } catch {
      return [];
    }
  },

  async getTrending(limit = 15): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/trending/anime?limit=${limit}`);
      if (!res.ok) return [];
      const json: { data: KitsuAnime[] } = await res.json();
      return json.data.map(transformKitsu);
    } catch {
      return [];
    }
  },
};
