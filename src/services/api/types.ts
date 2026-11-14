import { MediaItem, MediaSourceProvider } from '../types';

export interface ApiCredentials {
  tmdbApiKey?: string;
  tvdbApiKey?: string;
  omdbApiKey?: string;
  traktClientId?: string;
  simklClientId?: string;
  watchmodeApiKey?: string;
  imdbApiKey?: string;
  malClientId?: string;
}

export interface ProviderSearchResult {
  provider: MediaSourceProvider;
  items: MediaItem[];
  totalResults?: number;
}

export interface CrossReferenceMapping {
  primaryId: string;
  title: string;
  year?: number;
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: number;
  traktId?: number | string;
  tvmazeId?: number;
  simklId?: number;
  anilistId?: number;
  malId?: number;
  kitsuId?: number;
  anidbId?: number;
  shikimoriId?: number | string;
  myDramaListId?: string;
  wikidataId?: string;
}
