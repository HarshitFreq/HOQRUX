import { MediaItem } from '../../types';
import { POPULAR_ANIME_MAP } from '../mapping/fribbAnime';

const ANILIST_URL = 'https://graphql.anilist.co';

interface AniListMedia {
  id: number;
  idMal?: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverImage?: {
    extraLarge?: string;
    large?: string;
  };
  bannerImage?: string;
  startDate?: {
    year?: number;
  };
  description?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  genres?: string[];
  averageScore?: number;
  countryOfOrigin?: string; // 'JP' for Anime, 'CN' for Donghua, 'KR' for Aeni
  format?: string; // 'TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'
  studios?: {
    nodes?: { name: string }[];
  };
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
  };
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

function transformAniListMedia(media: AniListMedia): MediaItem {
  const displayTitle = media.title.english || media.title.romaji || 'Untitled';
  const poster = media.coverImage?.extraLarge || media.coverImage?.large || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';
  const score = media.averageScore ? Math.round((media.averageScore / 10) * 10) / 10 : 7.8;
  const isDonghua = media.countryOfOrigin === 'CN';
  const isMovie = media.format === 'MOVIE';
  const totalEps = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : (isMovie ? 1 : 12));

  const popular = POPULAR_ANIME_MAP[media.id];
  const resolvedTmdb = popular?.tmdb;

  return {
    id: `anilist-${media.id}`,
    tmdbId: resolvedTmdb,
    title: displayTitle,
    originalTitle: media.title.native || media.title.romaji,
    type: isMovie ? 'movie' : 'anime',
    sourceProvider: 'anilist',
    externalIds: {
      anilist: media.id,
      mal: media.idMal,
      tmdb: resolvedTmdb,
    },
    posterPath: poster,
    backdropPath: media.bannerImage || poster,
    releaseYear: media.startDate?.year || new Date().getFullYear(),
    overview: stripHtml(media.description) || 'No synopsis provided.',
    genres: media.genres && media.genres.length > 0 ? media.genres : [isDonghua ? 'Donghua' : 'Anime'],
    tmdbRating: score,
    imdbRating: score,
    communityRating: score,
    ratingSource: 'AniList',
    runtime: media.duration || 24,
    status: media.status,
    studios: media.studios?.nodes?.map((s) => s.name),
    totalEpisodes: totalEps,
    nextEpisodeToAir: media.nextAiringEpisode
      ? {
          seasonNumber: 1,
          episodeNumber: media.nextAiringEpisode.episode,
          title: `Episode ${media.nextAiringEpisode.episode}`,
          airDate: new Date(media.nextAiringEpisode.airingAt * 1000).toISOString().split('T')[0],
        }
      : undefined,
  };
}

const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      idMal
      countryOfOrigin
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
      }
      bannerImage
      startDate {
        year
      }
      description
      episodes
      duration
      status
      genres
      averageScore
      studios(isMain: true) {
        nodes {
          name
        }
      }
      nextAiringEpisode {
        airingAt
        episode
      }
    }
  }
}
`;

const TRENDING_ANIME_QUERY = `
query ($page: Int, $perPage: Int, $genre: String) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, genre: $genre, sort: [TRENDING_DESC, POPULARITY_DESC]) {
      id
      idMal
      countryOfOrigin
      title {
        romaji
        english
        native
      }
      coverImage {
        extraLarge
        large
      }
      bannerImage
      startDate {
        year
      }
      description
      episodes
      duration
      status
      genres
      averageScore
      studios(isMain: true) {
        nodes {
          name
        }
      }
    }
  }
}
`;

const MEDIA_BY_ID_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    countryOfOrigin
    format
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
    }
    bannerImage
    startDate {
      year
    }
    description
    episodes
    duration
    status
    genres
    averageScore
    studios(isMain: true) {
      nodes {
        name
      }
    }
    nextAiringEpisode {
      airingAt
      episode
    }
  }
}
`;

export const anilistService = {
  async getMediaById(id: number): Promise<MediaItem | null> {
    try {
      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: MEDIA_BY_ID_QUERY,
          variables: { id },
        }),
      });
      if (!res.ok) return null;
      const json: { data?: { Media?: AniListMedia } } = await res.json();
      if (!json.data?.Media) return null;
      return transformAniListMedia(json.data.Media);
    } catch {
      return null;
    }
  },

  async search(query: string, page = 1, perPage = 15): Promise<MediaItem[]> {
    try {
      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: SEARCH_QUERY,
          variables: { search: query, page, perPage },
        }),
      });
      if (!res.ok) return [];
      const json: { data: { Page: { media: AniListMedia[] } } } = await res.json();
      return json.data.Page.media.map(transformAniListMedia);
    } catch {
      return [];
    }
  },

  async getTrending(page = 1, perPage = 18, genre?: string): Promise<MediaItem[]> {
    try {
      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: TRENDING_ANIME_QUERY,
          variables: { page, perPage, ...(genre ? { genre } : {}) },
        }),
      });
      if (!res.ok) return [];
      const json: { data: { Page: { media: AniListMedia[] } } } = await res.json();
      return json.data.Page.media.map(transformAniListMedia);
    } catch {
      return [];
    }
  },
};
