import { MediaItem } from '../../types';
import { storageService } from '../../storage';

const BASE_URL = 'https://www.omdbapi.com';
const FALLBACK_KEY = 'trilogy'; // Well-known public demo educational key

interface OmdbResponse {
  Title?: string;
  Year?: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: { Source: string; Value: string }[];
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
  Type?: string;
  totalSeasons?: string;
  Response?: string;
  Error?: string;
}

export const omdbService = {
  async getMediaByImdbId(imdbId: string): Promise<Partial<MediaItem> | null> {
    try {
      const userKey = await storageService.getOmdbKey();
      const apiKey = userKey || FALLBACK_KEY;
      const res = await fetch(`${BASE_URL}/?apikey=${apiKey}&i=${imdbId}&plot=full`);
      if (!res.ok) return null;
      const data: OmdbResponse = await res.json();
      if (data.Response === 'False') return null;

      const imdbScore = data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : undefined;
      const runtimeMinutes = data.Runtime ? parseInt(data.Runtime.replace(' min', ''), 10) : undefined;

      return {
        imdbId: data.imdbID,
        imdbRating: imdbScore,
        runtime: isNaN(runtimeMinutes || 0) ? undefined : runtimeMinutes,
        directors: data.Director && data.Director !== 'N/A' ? data.Director.split(', ') : undefined,
        overview: data.Plot !== 'N/A' ? data.Plot : undefined,
        ratingSource: 'IMDb / OMDb',
      };
    } catch {
      return null;
    }
  },

  async searchByTitle(title: string, year?: number): Promise<Partial<MediaItem> | null> {
    try {
      const userKey = await storageService.getOmdbKey();
      const apiKey = userKey || FALLBACK_KEY;
      const yearParam = year ? `&y=${year}` : '';
      const res = await fetch(`${BASE_URL}/?apikey=${apiKey}&t=${encodeURIComponent(title)}${yearParam}&plot=full`);
      if (!res.ok) return null;
      const data: OmdbResponse = await res.json();
      if (data.Response === 'False') return null;

      const imdbScore = data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : undefined;
      const runtimeMinutes = data.Runtime ? parseInt(data.Runtime.replace(' min', ''), 10) : undefined;

      return {
        imdbId: data.imdbID,
        imdbRating: imdbScore,
        runtime: isNaN(runtimeMinutes || 0) ? undefined : runtimeMinutes,
        directors: data.Director && data.Director !== 'N/A' ? data.Director.split(', ') : undefined,
        overview: data.Plot !== 'N/A' ? data.Plot : undefined,
      };
    } catch {
      return null;
    }
  },
};
