export type MediaType = 'movie' | 'tv' | 'anime' | 'documentary' | 'asian_drama';

export type WatchStatus = 'watching' | 'plan_to_watch' | 'completed' | 'dropped';

export type MediaSourceProvider =
  // Global Movies & TV Series
  | 'tmdb'
  | 'thetvdb'
  | 'omdb'
  | 'tvmaze'
  | 'trakt'
  | 'simkl'
  | 'watchmode'
  | 'imdb'
  // Anime & Donghua
  | 'anilist'
  | 'jikan'
  | 'mal'
  | 'kitsu'
  | 'anidb'
  | 'shikimori'
  // Asian Dramas & Regional
  | 'mydramalist'
  // Documentaries, Classic & Niche
  | 'archive'
  | 'wikidata'
  // ID Mapping Databases
  | 'anime_offline'
  | 'fribb';

export interface ExternalIds {
  tmdb?: number;
  imdb?: string;
  tvdb?: number;
  trakt?: number | string;
  tvmaze?: number;
  simkl?: number;
  watchmode?: number;
  anilist?: number;
  mal?: number;
  kitsu?: number;
  anidb?: number;
  shikimori?: number | string;
  mydramalist?: number | string;
  wikidata?: string;
  archiveId?: string;
}

export interface StreamingProvider {
  id: string;
  name: string;
  type: 'stream' | 'rent' | 'buy';
  appUrl?: string;
  webUrl: string;
  badgeColor?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview: string;
  runtime: number; // minutes
  airDate: string;
  stillPath?: string;
  rating?: number;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodeCount: number;
  airDate: string;
  posterPath?: string;
  episodes: Episode[];
}

export interface CastMember {
  name: string;
  character: string;
  profilePath?: string;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  originalLanguage?: string;
  type: MediaType;
  sourceProvider?: MediaSourceProvider;
  externalIds?: ExternalIds;
  posterPath: string;
  backdropPath?: string;
  releaseYear: number;
  overview: string;
  genres: string[];
  tmdbRating: number;
  imdbRating?: number;
  communityRating?: number;
  ratingSource?: string;
  runtime?: number; // in minutes
  status?: string;
  network?: string;
  studios?: string[];
  directors?: string[];
  cast?: CastMember[];
  providers?: StreamingProvider[];
  seasons?: Season[];
  totalEpisodes?: number;
  composer?: string;
  soundtrack?: SoundtrackInfo;
  trailerKey?: string;
  trailerUrl?: string;
  nextEpisodeToAir?: {
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    airDate: string;
  };
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null;
  collection?: CollectionInfo;
}

export interface CollectionPart {
  id: number;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate: string;
  releaseYear?: number;
  isComingSoon?: boolean;
  orderIndex: number;
  overview?: string;
  voteAverage?: number;
}

export interface CollectionInfo {
  id: number;
  name: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  parts: CollectionPart[];
}

export interface StreamingPlatformFeed {
  providerId: number | string;
  name: string;
  badge: string;
  items: MediaItem[];
}

export interface SoundtrackInfo {
  albumName: string;
  composer?: string;
  artworkUrl?: string;
  spotifyUrl?: string;
  spotifyUri?: string;
  trackCount?: number;
  releaseYear?: number;
  isAvailable: boolean;
}

export interface EpisodeProgress {
  watched: boolean;
  watchedAt: string;
}

export interface UserTitleTracking {
  titleId: string;
  status: WatchStatus;
  rating?: number; // 0.5 to 5.0
  review?: string;
  rewatchCount: number;
  favorite: boolean;
  reminderEnabled?: boolean;
  watchedEpisodes: Record<string, EpisodeProgress>; // key: "s1e1", "s2e5", etc.
  lastWatchedSeason?: number;
  lastWatchedEpisode?: number;
  completedAt?: string;
  updatedAt: string;
  cachedMediaItem?: MediaItem;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  accentColor?: string;
  titleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ViewingHistoryEntry {
  id: string;
  titleId: string;
  titleName: string;
  mediaType: MediaType;
  posterPath: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  watchedAt: string;
}

export interface UserStats {
  totalHoursWatched: number;
  totalEpisodesWatched: number;
  totalMoviesWatched: number;
  totalShowsTracked: number;
  streakDays: number;
  averageRating?: number;
  topGenres: { genre: string; count: number; percentage: number }[];
}
