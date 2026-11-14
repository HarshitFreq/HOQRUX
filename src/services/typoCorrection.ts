import { INITIAL_MEDIA_ITEMS } from './mockData';

// Cache for suggestions to eliminate duplicate network calls
const suggestionsCache = new Map<string, string[]>();
const correctionsCache = new Map<string, { corrected: string; isCorrected: boolean }>();

/**
 * Fast Levenshtein Distance calculation
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);

  for (let i = 0; i <= b.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}

/**
 * Similarity metric between 0.0 (unrelated) and 1.0 (identical)
 */
export function stringSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLen;
}

/**
 * Curated seed list of high-frequency media titles for instant local matching
 */
const CANONICAL_SEED_TITLES: string[] = [
  ...INITIAL_MEDIA_ITEMS.map((it) => it.title),
  'Interstellar',
  'Oppenheimer',
  'Breaking Bad',
  'Spider-Man',
  'The Batman',
  'Inception',
  'Gladiator',
  'Peaky Blinders',
  'Stranger Things',
  'Attack on Titan',
  'Jujutsu Kaisen',
  'Demon Slayer',
  'Game of Thrones',
  'Better Call Saul',
  'The Godfather',
  'The Dark Knight',
  'Pulp Fiction',
  'Fight Club',
  'Forrest Gump',
  'The Matrix',
  'Goodfellas',
  'Star Wars',
  'Avatar',
  'Avengers',
  'Naruto',
  'One Piece',
  'Bleach',
  'Death Note',
  'Severance',
  'The Bear',
  'Dark',
  'Succession',
  'Squid Game',
  'Godzilla',
];

/**
 * Strip search noise & query modifiers
 */
function cleanSuggestionItem(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/\s*\((film|movie|tv series|series|anime|manga)\)/gi, '');
  cleaned = cleaned.replace(
    /\s+(cast|meaning|trailer|characters|season\s*\d+|episodes?|full movie|download|release date|imdb|wiki|ott|review|summary|ending explained|explained).*$/gi,
    ''
  );
  return cleaned.trim();
}

export const typoCorrectionService = {
  /**
   * Find closest title in local cache or initial media collection
   */
  findLocalMatch(query: string, candidateTitles?: string[]): string | null {
    const cleanQ = query.toLowerCase().trim();
    if (cleanQ.length < 3) return null;

    const list = candidateTitles && candidateTitles.length > 0 ? candidateTitles : CANONICAL_SEED_TITLES;
    let bestMatch: string | null = null;
    let minDistance = 999;
    let bestSimilarity = 0;

    for (const title of list) {
      const cleanTitle = title.toLowerCase().trim();
      if (cleanTitle === cleanQ) return title;

      const dist = levenshteinDistance(cleanQ, cleanTitle);
      const sim = stringSimilarity(cleanQ, cleanTitle);

      // Max allowable typo distance based on length
      const maxAllowed = cleanQ.length <= 5 ? 1 : cleanQ.length <= 10 ? 2 : 3;

      if (dist <= maxAllowed && sim > 0.72) {
        if (dist < minDistance || (dist === minDistance && sim > bestSimilarity)) {
          minDistance = dist;
          bestSimilarity = sim;
          bestMatch = title;
        }
      }
    }

    return bestMatch;
  },

  /**
   * Fetch live autocomplete & typo suggestions
   */
  async getSuggestions(query: string): Promise<string[]> {
    const cleanQ = query.trim().toLowerCase();
    if (cleanQ.length < 2) return [];

    if (suggestionsCache.has(cleanQ)) {
      return suggestionsCache.get(cleanQ)!;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900);

      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(cleanQ)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawItems: string[] = Array.isArray(data[1]) ? data[1] : [];
        const cleaned: string[] = [];
        const seen = new Set<string>();

        for (const item of rawItems) {
          const c = cleanSuggestionItem(item).toLowerCase();
          if (c && c.length >= 2 && !seen.has(c)) {
            seen.add(c);
            cleaned.push(c);
            if (cleaned.length >= 4) break;
          }
        }

        suggestionsCache.set(cleanQ, cleaned);
        return cleaned;
      }
    } catch {
      // Return local match as fallback suggestion if available
      const local = this.findLocalMatch(cleanQ);
      if (local) return [local.toLowerCase()];
    }

    return [];
  },

  /**
   * Detect and resolve potential typo
   */
  async resolveTypo(
    query: string,
    localCandidates?: string[]
  ): Promise<{ corrected: string; isCorrected: boolean; suggestions: string[] }> {
    const cleanQ = query.trim().toLowerCase();
    if (cleanQ.length < 3) {
      return { corrected: query, isCorrected: false, suggestions: [] };
    }

    if (correctionsCache.has(cleanQ)) {
      const cached = correctionsCache.get(cleanQ)!;
      const suggestions = suggestionsCache.get(cleanQ) || [];
      return { ...cached, suggestions };
    }

    // 1. Try local exact or fuzzy match
    const localMatch = this.findLocalMatch(cleanQ, localCandidates);
    if (localMatch && localMatch.toLowerCase() !== cleanQ) {
      const res = { corrected: localMatch, isCorrected: true, suggestions: [localMatch.toLowerCase()] };
      correctionsCache.set(cleanQ, { corrected: localMatch, isCorrected: true });
      return res;
    }

    // 2. Fetch network suggestion
    const suggestions = await this.getSuggestions(cleanQ);
    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0].toLowerCase().trim();
      const dist = levenshteinDistance(cleanQ, topSuggestion);
      const sim = stringSimilarity(cleanQ, topSuggestion);

      // If it's a spelling correction (close distance and high similarity)
      const maxAllowed = cleanQ.length <= 5 ? 1 : cleanQ.length <= 10 ? 2 : 3;
      if (topSuggestion !== cleanQ && dist <= maxAllowed && sim >= 0.72) {
        const result = { corrected: suggestions[0], isCorrected: true, suggestions };
        correctionsCache.set(cleanQ, { corrected: suggestions[0], isCorrected: true });
        return result;
      }
    }

    const noCorrection = { corrected: query, isCorrected: false, suggestions };
    correctionsCache.set(cleanQ, { corrected: query, isCorrected: false });
    return noCorrection;
  },
};
