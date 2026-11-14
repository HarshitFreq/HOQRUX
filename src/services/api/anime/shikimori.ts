import { MediaItem } from '../../types';

const BASE_URL = 'https://shikimori.one/api';
const CDN_URL = 'https://shikimori.one';

interface ShikimoriAnime {
  id: number;
  name: string;
  russian?: string;
  image: {
    original?: string;
    preview?: string;
  };
  url: string;
  kind?: string;
  score?: string;
  status?: string;
  episodes?: number;
  episodes_aired?: number;
  aired_on?: string;
  released_on?: string;
}

function transformShikimori(item: ShikimoriAnime): MediaItem {
  const poster = item.image.original ? `${CDN_URL}${item.image.original}` : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';
  const score = item.score ? parseFloat(item.score) : 7.8;
  const year = item.aired_on ? parseInt(item.aired_on.slice(0, 4), 10) : new Date().getFullYear();

  return {
    id: `shikimori-${item.id}`,
    title: item.name,
    type: 'anime',
    sourceProvider: 'shikimori',
    externalIds: {
      shikimori: item.id,
    },
    posterPath: poster,
    releaseYear: isNaN(year) ? new Date().getFullYear() : year,
    overview: `Status: ${item.status || 'unknown'}. Episodes: ${item.episodes || 0}.`,
    genres: ['Anime'],
    tmdbRating: score,
    communityRating: score,
    ratingSource: 'Shikimori',
    status: item.status,
    totalEpisodes: item.episodes,
  };
}

export const shikimoriService = {
  async search(query: string, limit = 15): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/animes?search=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: { 'User-Agent': 'HOQRUX-CinemaTracker/1.0' },
      });
      if (!res.ok) return [];
      const data: ShikimoriAnime[] = await res.json();
      return data.map(transformShikimori);
    } catch {
      return [];
    }
  },
};
