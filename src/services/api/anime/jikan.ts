import { MediaItem } from '../../types';
import { POPULAR_ANIME_MAP } from '../mapping/fribbAnime';

const BASE_URL = 'https://api.jikan.moe/v4';

interface JikanAnime {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url?: string;
    };
    webp?: {
      image_url: string;
      large_image_url?: string;
    };
  };
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  source?: string;
  episodes?: number;
  status?: string;
  airing?: boolean;
  score?: number;
  synopsis?: string;
  year?: number;
  genres?: { name: string }[];
  studios?: { name: string }[];
}

function transformJikan(anime: JikanAnime): MediaItem {
  const poster = anime.images.webp?.large_image_url || anime.images.jpg.large_image_url || anime.images.jpg.image_url;
  const rating = anime.score || 8.0;
  const popular = Object.values(POPULAR_ANIME_MAP).find((m) => m.mal === anime.mal_id);
  const resolvedTmdb = popular?.tmdb;

  return {
    id: `mal-${anime.mal_id}`,
    tmdbId: resolvedTmdb,
    title: anime.title_english || anime.title,
    originalTitle: anime.title_japanese,
    type: 'anime',
    sourceProvider: 'jikan',
    externalIds: {
      mal: anime.mal_id,
      tmdb: resolvedTmdb,
    },
    posterPath: poster,
    backdropPath: poster,
    releaseYear: anime.year || new Date().getFullYear(),
    overview: anime.synopsis || 'No synopsis provided.',
    genres: anime.genres ? anime.genres.map((g) => g.name) : ['Anime'],
    tmdbRating: rating,
    imdbRating: rating,
    communityRating: rating,
    ratingSource: 'MyAnimeList',
    status: anime.status,
    studios: anime.studios ? anime.studios.map((s) => s.name) : undefined,
    totalEpisodes: anime.episodes,
  };
}

export const jikanService = {
  async getMediaById(id: number | string): Promise<MediaItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/anime/${id}`);
      if (!res.ok) return null;
      const data: { data?: JikanAnime } = await res.json();
      if (!data.data) return null;
      return transformJikan(data.data);
    } catch {
      return null;
    }
  },

  async search(query: string, limit = 15): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`);
      if (!res.ok) return [];
      const data: { data: JikanAnime[] } = await res.json();
      return data.data.map(transformJikan);
    } catch {
      return [];
    }
  },

  async getTopAnime(limit = 15): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/top/anime?limit=${limit}`);
      if (!res.ok) return [];
      const data: { data: JikanAnime[] } = await res.json();
      return data.data.map(transformJikan);
    } catch {
      return [];
    }
  },
};
