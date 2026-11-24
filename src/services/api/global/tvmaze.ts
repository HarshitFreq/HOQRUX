import { MediaItem, Season, Episode } from '../../types';

const BASE_URL = 'https://api.tvmaze.com';

interface TVmazeShow {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime?: number;
  averageRuntime?: number;
  premiered?: string;
  ended?: string;
  officialSite?: string;
  schedule?: {
    time: string;
    days: string[];
  };
  rating?: {
    average?: number;
  };
  network?: {
    name: string;
  };
  webChannel?: {
    name: string;
  };
  image?: {
    medium?: string;
    original?: string;
  };
  summary?: string;
  externals?: {
    tvrage?: number;
    thetvdb?: number;
    imdb?: string;
  };
  _embedded?: {
    episodes?: TVmazeEpisode[];
    cast?: TVmazeCast[];
  };
}

interface TVmazeEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  runtime?: number;
  image?: {
    medium?: string;
    original?: string;
  };
  summary?: string;
  rating?: {
    average?: number;
  };
}

interface TVmazeCast {
  person: {
    id: number;
    name: string;
    image?: {
      medium?: string;
      original?: string;
    };
  };
  character: {
    id: number;
    name: string;
  };
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

function transformTVmazeShow(show: TVmazeShow): MediaItem {
  const releaseYear = show.premiered ? parseInt(show.premiered.slice(0, 4), 10) : new Date().getFullYear();
  const poster = show.image?.original || show.image?.medium || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500';
  const score = show.rating?.average || 7.5;

  let seasons: Season[] = [];
  if (show._embedded?.episodes) {
    const seasonMap = new Map<number, Episode[]>();
    for (const ep of show._embedded.episodes) {
      const epObj: Episode = {
        id: `tvmaze-ep-${ep.id}`,
        seasonNumber: ep.season,
        episodeNumber: ep.number,
        title: ep.name || `Episode ${ep.number}`,
        overview: stripHtml(ep.summary),
        runtime: ep.runtime || show.runtime || show.averageRuntime || 45,
        airDate: ep.airdate || '',
        stillPath: ep.image?.original || ep.image?.medium,
        rating: ep.rating?.average,
      };
      if (!seasonMap.has(ep.season)) {
        seasonMap.set(ep.season, []);
      }
      seasonMap.get(ep.season)!.push(epObj);
    }

    seasons = Array.from(seasonMap.entries()).map(([sNum, eps]) => ({
      seasonNumber: sNum,
      title: `Season ${sNum}`,
      episodeCount: eps.length,
      airDate: eps[0]?.airDate || '',
      episodes: eps,
    }));
  }

  const castList = show._embedded?.cast?.slice(0, 16).map((c) => ({
    name: c.person?.name || 'Unknown',
    character: c.character?.name || '',
    profilePath: c.person?.image?.medium || c.person?.image?.original || undefined,
  }));

  return {
    id: `tvmaze-${show.id}`,
    imdbId: show.externals?.imdb,
    title: show.name,
    type: 'tv',
    sourceProvider: 'tvmaze',
    externalIds: {
      tvmaze: show.id,
      imdb: show.externals?.imdb,
      tvdb: show.externals?.thetvdb,
    },
    posterPath: poster,
    backdropPath: poster,
    releaseYear,
    overview: stripHtml(show.summary) || 'No synopsis available.',
    genres: show.genres.length > 0 ? show.genres : ['Drama'],
    tmdbRating: score,
    imdbRating: score,
    communityRating: score,
    ratingSource: 'TVmaze',
    runtime: show.runtime || show.averageRuntime || 45,
    status: show.status,
    network: show.network?.name || show.webChannel?.name,
    cast: castList,
    seasons: seasons.length > 0 ? seasons : undefined,
    totalEpisodes: show._embedded?.episodes?.length,
  };
}

export const tvmazeService = {
  async search(query: string): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data: { show: TVmazeShow }[] = await res.json();
      return data.map((d) => transformTVmazeShow(d.show));
    } catch {
      return [];
    }
  },

  async getShowDetails(tvmazeId: number | string): Promise<MediaItem | null> {
    try {
      const rawId = String(tvmazeId).replace('tvmaze-', '');
      const res = await fetch(`${BASE_URL}/shows/${rawId}?embed[]=episodes&embed[]=cast`);
      if (!res.ok) return null;
      const data: TVmazeShow = await res.json();
      return transformTVmazeShow(data);
    } catch {
      return null;
    }
  },

  async getEpisodesByTitle(title: string, isAnime = false): Promise<Season[]> {
    try {
      if (isAnime) {
        // Query search to specifically find the animated series, not a live-action reboot/adaptation
        const res = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(title)}`);
        if (!res.ok) return [];
        const shows: { show: TVmazeShow }[] = await res.json();
        const animShow = shows.find((s) => s.show.type === 'Animation' || s.show.genres?.includes('Anime'));
        if (animShow) {
          const detailRes = await fetch(`${BASE_URL}/shows/${animShow.show.id}?embed=episodes`);
          if (detailRes.ok) {
            const data: TVmazeShow = await detailRes.json();
            const transformed = transformTVmazeShow(data);
            return transformed.seasons || [];
          }
        }
        return [];
      }

      const res = await fetch(`${BASE_URL}/singlesearch/shows?q=${encodeURIComponent(title)}&embed=episodes`);
      if (!res.ok) return [];
      const data: TVmazeShow = await res.json();
      const transformed = transformTVmazeShow(data);
      return transformed.seasons || [];
    } catch {
      return [];
    }
  },

  async getSchedule(country = 'US'): Promise<MediaItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/schedule?country=${country}`);
      if (!res.ok) return [];
      const episodes: { show: TVmazeShow }[] = await res.json();
      const uniqueShows = new Map<number, TVmazeShow>();
      for (const item of episodes) {
        if (item.show && !uniqueShows.has(item.show.id)) {
          uniqueShows.set(item.show.id, item.show);
        }
      }
      return Array.from(uniqueShows.values()).slice(0, 15).map(transformTVmazeShow);
    } catch {
      return [];
    }
  },
};
