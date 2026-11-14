import { MediaItem } from '../../types';

// Unofficial MyDramaList API gateway / search proxy
const MDL_SEARCH_URL = 'https://kuryana.vercel.app/search/q';

interface MDLResult {
  title: string;
  thumbnail?: string;
  year?: string;
  type?: string;
  slug?: string;
  rating?: string;
}

export const myDramaListService = {
  async search(query: string): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${MDL_SEARCH_URL}/${encodeURIComponent(query)}`);
      if (!res.ok) return [];

      const json: { results?: MDLResult[] } = await res.json();
      if (!json.results) return [];

      return json.results.map((item, index) => {
        const year = item.year ? parseInt(item.year, 10) : new Date().getFullYear();
        const score = item.rating ? parseFloat(item.rating) : 8.2;
        const poster = item.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500';

        return {
          id: `mdl-${item.slug || index}`,
          title: item.title,
          type: 'asian_drama',
          sourceProvider: 'mydramalist',
          externalIds: {
            mydramalist: item.slug,
          },
          posterPath: poster,
          releaseYear: isNaN(year) ? new Date().getFullYear() : year,
          overview: `${item.type || 'Drama'} cataloged on MyDramaList.`,
          genres: ['Asian Drama', item.type || 'Drama'],
          tmdbRating: score,
          communityRating: score,
          ratingSource: 'MyDramaList',
        };
      });
    } catch {
      return [];
    }
  },
};
