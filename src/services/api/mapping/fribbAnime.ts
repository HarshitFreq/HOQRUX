import { ExternalIds } from '../../types';

const FRIBB_MINI_URL =
  'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json';

interface FribbEntry {
  anidb_id?: number;
  anilist_id?: number;
  myanimelist_id?: number;
  kitsu_id?: number;
  thetvdb_id?: number;
  themoviedb_id?: number | { tv?: number; movie?: number };
  imdb_id?: string | string[];
  trakt_id?: number;
}

// Instant high-speed mapping dictionary for top anime (eliminates 6MB download latency)
export const POPULAR_ANIME_MAP: Record<number, { tmdb?: number; imdb?: string; tvdb?: number; mal?: number; type?: 'movie' | 'tv' }> = {
  // --- Popular Series ---
  21: { tmdb: 37854, imdb: 'tt0388629', tvdb: 81797, mal: 21, type: 'tv' }, // One Piece
  20: { tmdb: 46260, imdb: 'tt0409591', tvdb: 78857, mal: 20, type: 'tv' }, // Naruto
  1735: { tmdb: 31910, imdb: 'tt0988824', tvdb: 79824, mal: 1735, type: 'tv' }, // Naruto Shippuden
  16498: { tmdb: 1429, imdb: 'tt2560140', tvdb: 267440, mal: 16498, type: 'tv' }, // Attack on Titan
  113415: { tmdb: 95479, imdb: 'tt12343534', tvdb: 373757, mal: 40748, type: 'tv' }, // Jujutsu Kaisen
  101922: { tmdb: 85937, imdb: 'tt9335498', tvdb: 352467, mal: 38000, type: 'tv' }, // Demon Slayer
  1535: { tmdb: 13916, imdb: 'tt0877057', tvdb: 79549, mal: 1535, type: 'tv' }, // Death Note
  269: { tmdb: 30984, imdb: 'tt0434665', tvdb: 75782, mal: 269, type: 'tv' }, // Bleach
  114446: { tmdb: 157200, imdb: 'tt14271916', tvdb: 413346, mal: 41467, type: 'tv' }, // Bleach: TYBW
  11061: { tmdb: 46298, imdb: 'tt2098220', tvdb: 252322, mal: 11061, type: 'tv' }, // Hunter x Hunter
  5114: { tmdb: 31911, imdb: 'tt1430030', tvdb: 85249, mal: 5114, type: 'tv' }, // FMA Brotherhood
  21459: { tmdb: 65930, imdb: 'tt5626028', tvdb: 305074, mal: 31964, type: 'tv' }, // My Hero Academia
  813: { tmdb: 12971, imdb: 'tt0214341', tvdb: 76666, mal: 813, type: 'tv' }, // Dragon Ball Z
  21175: { tmdb: 62715, imdb: 'tt4644488', tvdb: 295068, mal: 30694, type: 'tv' }, // Dragon Ball Super
  127230: { tmdb: 114410, imdb: 'tt13616990', tvdb: 393437, mal: 44511, type: 'tv' }, // Chainsaw Man
  140960: { tmdb: 120089, imdb: 'tt13706018', tvdb: 411893, mal: 50273, type: 'tv' }, // Spy x Family
  154587: { tmdb: 209867, imdb: 'tt22245232', tvdb: 424785, mal: 52991, type: 'tv' }, // Frieren
  151807: { tmdb: 210879, imdb: 'tt21209876', tvdb: 421946, mal: 52299, type: 'tv' }, // Solo Leveling
  20605: { tmdb: 61459, imdb: 'tt3741634', tvdb: 281646, mal: 22319, type: 'tv' }, // Tokyo Ghoul
  11757: { tmdb: 45782, imdb: 'tt2250192', tvdb: 259640, mal: 11757, type: 'tv' }, // Sword Art Online
  1: { tmdb: 30991, imdb: 'tt0213338', tvdb: 76885, mal: 1, type: 'tv' }, // Cowboy Bebop
  9253: { tmdb: 42635, imdb: 'tt1910272', tvdb: 245081, mal: 9253, type: 'tv' }, // Steins;Gate
  1575: { tmdb: 31724, imdb: 'tt0897358', tvdb: 79590, mal: 1575, type: 'tv' }, // Code Geass
  101348: { tmdb: 89053, imdb: 'tt10052324', tvdb: 361405, mal: 37521, type: 'tv' }, // Vinland Saga
  120377: { tmdb: 105248, imdb: 'tt12590266', tvdb: 384357, mal: 42310, type: 'tv' }, // Cyberpunk: Edgerunners
  30: { tmdb: 890, imdb: 'tt0112159', tvdb: 76706, mal: 30, type: 'tv' }, // Evangelion
  21507: { tmdb: 67070, imdb: 'tt5897304', tvdb: 311029, mal: 32182, type: 'tv' }, // Mob Psycho 100
  21087: { tmdb: 63926, imdb: 'tt4508902', tvdb: 293088, mal: 30276, type: 'tv' }, // One Punch Man
  97940: { tmdb: 73223, imdb: 'tt7441658', tvdb: 331753, mal: 34572, type: 'tv' }, // Black Clover
  14719: { tmdb: 46029, imdb: 'tt2359704', tvdb: 262330, mal: 14719, type: 'tv' }, // JoJo
  20464: { tmdb: 60863, imdb: 'tt3563434', tvdb: 279532, mal: 20583, type: 'tv' }, // Haikyuu!!
  105333: { tmdb: 86031, imdb: 'tt9352936', tvdb: 355755, mal: 38691, type: 'tv' }, // Dr. Stone
  101921: { tmdb: 83097, imdb: 'tt9523664', tvdb: 354674, mal: 37999, type: 'tv' }, // Kaguya-sama
  130003: { tmdb: 209534, imdb: 'tt17028122', tvdb: 417246, mal: 47917, type: 'tv' }, // Bocchi
  150672: { tmdb: 203737, imdb: 'tt21027658', tvdb: 420846, mal: 52034, type: 'tv' }, // Oshi no Ko
  171018: { tmdb: 240411, imdb: 'tt30198642', tvdb: 442656, mal: 57334, type: 'tv' }, // Dandadan
  161645: { tmdb: 221851, imdb: 'tt26743210', tvdb: 431326, mal: 54492, type: 'tv' }, // The Apothecary Diaries
  177488: { tmdb: 46029, imdb: 'tt2359704', tvdb: 262330, mal: 177488, type: 'tv' }, // Steel Ball Run

  // --- Canonical Anime Movies & Studio Ghibli ---
  20555: { tmdb: 242828, imdb: 'tt3398268', mal: 242828, type: 'movie' }, // When Marnie Was There
  199: { tmdb: 129, imdb: 'tt0245429', mal: 199, type: 'movie' }, // Spirited Away
  164: { tmdb: 128, imdb: 'tt0119698', mal: 164, type: 'movie' }, // Princess Mononoke
  433: { tmdb: 4935, imdb: 'tt0347149', mal: 433, type: 'movie' }, // Howl's Moving Castle
  21519: { tmdb: 372058, imdb: 'tt5311514', mal: 32281, type: 'movie' }, // Your Name
  20954: { tmdb: 378064, imdb: 'tt5323662', mal: 28851, type: 'movie' }, // A Silent Voice
  106286: { tmdb: 568160, imdb: 'tt9426210', mal: 38826, type: 'movie' }, // Weathering With You
  2236: { tmdb: 149, imdb: 'tt0095327', mal: 2236, type: 'movie' }, // My Neighbor Totoro
  149: { tmdb: 4771, imdb: 'tt0097814', mal: 149, type: 'movie' }, // Kiki's Delivery Service
  47: { tmdb: 149, imdb: 'tt0095765', mal: 47, type: 'movie' }, // Akira
  10757: { tmdb: 652837, imdb: 'tt1865718', mal: 10757, type: 'movie' }, // From Up on Poppy Hill
  5941: { tmdb: 8392, imdb: 'tt0876563', mal: 5941, type: 'movie' }, // Ponyo
  7385: { tmdb: 51608, imdb: 'tt1568921', mal: 7385, type: 'movie' }, // The Secret World of Arrietty
  16662: { tmdb: 149871, imdb: 'tt2013293', mal: 16662, type: 'movie' }, // The Wind Rises
  16782: { tmdb: 149870, imdb: 'tt2576852', mal: 16782, type: 'movie' }, // The Tale of the Princess Kaguya
  143534: { tmdb: 508883, imdb: 'tt6587046', mal: 45776, type: 'movie' }, // The Boy and the Heron
  109193: { tmdb: 635302, imdb: 'tt11032374', mal: 40456, type: 'movie' }, // Demon Slayer: Mugen Train
  128547: { tmdb: 916224, imdb: 'tt19770238', mal: 48583, type: 'movie' }, // Suzume
  523: { tmdb: 37799, imdb: 'tt0096283', mal: 523, type: 'movie' }, // Grave of the Fireflies
};

let cachedFribbList: FribbEntry[] | null = null;
let fetchPromise: Promise<FribbEntry[]> | null = null;

export const fribbService = {
  async loadMappings(): Promise<FribbEntry[]> {
    if (cachedFribbList) return cachedFribbList;
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch(FRIBB_MINI_URL)
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data: FribbEntry[]) => {
        cachedFribbList = data;
        return data;
      })
      .catch(() => [])
      .finally(() => {
        fetchPromise = null;
      });

    return fetchPromise;
  },

  async findMappings(lookup: {
    anilistId?: number;
    malId?: number;
    tmdbId?: number;
    imdbId?: string;
    tvdbId?: number;
  }): Promise<ExternalIds | null> {
    // 1. Instant check in top popular anime dictionary
    if (lookup.anilistId && POPULAR_ANIME_MAP[lookup.anilistId]) {
      const match = POPULAR_ANIME_MAP[lookup.anilistId];
      return {
        anilist: lookup.anilistId,
        tmdb: match.tmdb,
        imdb: match.imdb,
        tvdb: match.tvdb,
        mal: match.mal,
      };
    }
    if (lookup.malId) {
      const entry = Object.entries(POPULAR_ANIME_MAP).find(([_, v]) => v.mal === lookup.malId);
      if (entry) {
        return {
          anilist: parseInt(entry[0], 10),
          tmdb: entry[1].tmdb,
          imdb: entry[1].imdb,
          tvdb: entry[1].tvdb,
          mal: lookup.malId,
        };
      }
    }
    if (lookup.tmdbId) {
      const entry = Object.entries(POPULAR_ANIME_MAP).find(([_, v]) => v.tmdb === lookup.tmdbId);
      if (entry) {
        return {
          anilist: parseInt(entry[0], 10),
          tmdb: lookup.tmdbId,
          imdb: entry[1].imdb,
          tvdb: entry[1].tvdb,
          mal: entry[1].mal,
        };
      }
    }

    const list = await this.loadMappings();
    if (!list || list.length === 0) return null;

    const match = list.find((item) => {
      if (lookup.anilistId && item.anilist_id === lookup.anilistId) return true;
      if (lookup.malId && item.myanimelist_id === lookup.malId) return true;
      if (lookup.tmdbId) {
        const itemTmdb = typeof item.themoviedb_id === 'number'
          ? item.themoviedb_id
          : item.themoviedb_id?.tv || item.themoviedb_id?.movie;
        if (itemTmdb === lookup.tmdbId) return true;
      }
      if (lookup.imdbId) {
        const imdbs = Array.isArray(item.imdb_id) ? item.imdb_id : (item.imdb_id ? [item.imdb_id] : []);
        if (imdbs.includes(lookup.imdbId)) return true;
      }
      if (lookup.tvdbId && item.thetvdb_id === lookup.tvdbId) return true;
      return false;
    });

    if (!match) return null;

    const resolvedTmdb = typeof match.themoviedb_id === 'number'
      ? match.themoviedb_id
      : match.themoviedb_id?.tv || match.themoviedb_id?.movie;
    const resolvedImdb = Array.isArray(match.imdb_id) ? match.imdb_id[0] : match.imdb_id;

    return {
      anilist: match.anilist_id,
      mal: match.myanimelist_id,
      tmdb: resolvedTmdb,
      imdb: resolvedImdb,
      tvdb: match.thetvdb_id,
      kitsu: match.kitsu_id,
      anidb: match.anidb_id,
      trakt: match.trakt_id,
    };
  },
};
