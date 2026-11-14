import { ExternalIds } from '../../types';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

export const wikidataService = {
  async resolveExternalIdsByImdb(imdbId: string): Promise<ExternalIds | null> {
    try {
      const sparql = `
        SELECT ?item ?tmdbId ?rottenTomatoes ?letterboxd WHERE {
          ?item wdt:P345 "${imdbId}".
          OPTIONAL { ?item wdt:P4985 ?tmdbId. }
          OPTIONAL { ?item wdt:P1258 ?rottenTomatoes. }
          OPTIONAL { ?item wdt:P6127 ?letterboxd. }
        } LIMIT 1
      `;
      const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'HOQRUX-MediaTracker/1.0',
        },
      });
      if (!res.ok) return null;

      const data = await res.json();
      const binding = data.results?.bindings?.[0];
      if (!binding) return null;

      const wikidataUri = binding.item?.value;
      const qid = wikidataUri ? wikidataUri.split('/').pop() : undefined;
      const tmdbVal = binding.tmdbId?.value ? parseInt(binding.tmdbId.value, 10) : undefined;

      return {
        imdb: imdbId,
        wikidata: qid,
        tmdb: tmdbVal,
      };
    } catch {
      return null;
    }
  },
};
