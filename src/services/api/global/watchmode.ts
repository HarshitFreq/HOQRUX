import { StreamingProvider } from '../../types';
import { storageService } from '../../storage';

const BASE_URL = 'https://api.watchmode.com/v1';

interface WatchmodeSource {
  source_id: number;
  name: string;
  type: 'sub' | 'rent' | 'buy' | 'free';
  region: string;
  web_url: string;
  format?: string;
  price?: number;
}

export const watchmodeService = {
  async getStreamingSources(tmdbId: number, mediaType: 'movie' | 'tv' = 'tv'): Promise<StreamingProvider[]> {
    try {
      const apiKey = await storageService.getWatchmodeKey();
      if (!apiKey) return [];

      const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
      const searchRes = await fetch(
        `${BASE_URL}/search/?apiKey=${apiKey}&search_field=tmdb_${typeParam}_id&search_value=${tmdbId}`
      );
      if (!searchRes.ok) return [];

      const searchData: { title_results?: { id: number }[] } = await searchRes.json();
      const watchmodeId = searchData.title_results?.[0]?.id;
      if (!watchmodeId) return [];

      const sourcesRes = await fetch(`${BASE_URL}/title/${watchmodeId}/sources/?apiKey=${apiKey}`);
      if (!sourcesRes.ok) return [];

      const sources: WatchmodeSource[] = await sourcesRes.json();
      const seen = new Set<string>();
      const providers: StreamingProvider[] = [];

      for (const s of sources) {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          const pType: 'stream' | 'rent' | 'buy' =
            s.type === 'sub' || s.type === 'free' ? 'stream' : s.type === 'rent' ? 'rent' : 'buy';

          providers.push({
            id: `watchmode-${s.source_id}`,
            name: s.name,
            type: pType,
            webUrl: s.web_url,
          });
        }
      }

      return providers;
    } catch {
      return [];
    }
  },
};
