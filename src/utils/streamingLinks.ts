/**
 * Direct Streaming Link & Deep Link Resolver
 *
 * Resolves direct service URLs (and native app deep links) for streaming providers
 * so users are routed directly to the content/search on the native platform rather
 * than being redirected to external referral or aggregator websites.
 */

export interface ResolvedStreamingLink {
  webUrl: string;
  appUrl?: string;
  badgeColor: string;
}

interface PlatformConfig {
  matchRegex: RegExp;
  badgeColor: string;
  getWebUrl: (encodedTitle: string, type: 'stream' | 'rent' | 'buy') => string;
  getAppUrl?: (encodedTitle: string, type: 'stream' | 'rent' | 'buy') => string;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    matchRegex: /netflix/i,
    badgeColor: '#E50914',
    getWebUrl: (q) => `https://www.netflix.com/search?q=${q}`,
    getAppUrl: (q) => `nflx://www.netflix.com/search?q=${q}`,
  },
  {
    matchRegex: /prime|amazon/i,
    badgeColor: '#00A8E1',
    getWebUrl: (q, type) =>
      type === 'rent' || type === 'buy'
        ? `https://www.amazon.com/s?k=${q}&i=instant-video`
        : `https://www.amazon.com/s?k=${q}&i=prime-instant-video`,
    getAppUrl: (q) => `primevideo://search?query=${q}`,
  },
  {
    matchRegex: /disney/i,
    badgeColor: '#113CCF',
    getWebUrl: (q) => `https://www.disneyplus.com/search?q=${q}`,
    getAppUrl: (q) => `disneyplus://search?q=${q}`,
  },
  {
    matchRegex: /apple\s*tv/i,
    badgeColor: '#000000',
    getWebUrl: (q) => `https://tv.apple.com/search?term=${q}`,
    getAppUrl: (q) => `videos://search?term=${q}`,
  },
  {
    matchRegex: /max|hbo/i,
    badgeColor: '#002BE7',
    getWebUrl: (q) => `https://play.max.com/search?q=${q}`,
    getAppUrl: (q) => `max://search?q=${q}`,
  },
  {
    matchRegex: /hulu/i,
    badgeColor: '#1CE783',
    getWebUrl: (q) => `https://www.hulu.com/search?q=${q}`,
    getAppUrl: (q) => `hulu://search?q=${q}`,
  },
  {
    matchRegex: /crunchyroll/i,
    badgeColor: '#F47521',
    getWebUrl: (q) => `https://www.crunchyroll.com/search?q=${q}`,
    getAppUrl: (q) => `crunchyroll://search?q=${q}`,
  },
  {
    matchRegex: /peacock/i,
    badgeColor: '#000000',
    getWebUrl: (q) => `https://www.peacocktv.com/search?q=${q}`,
    getAppUrl: (q) => `peacock://search?q=${q}`,
  },
  {
    matchRegex: /paramount/i,
    badgeColor: '#0064FF',
    getWebUrl: (q) => `https://www.paramountplus.com/search/?query=${q}`,
    getAppUrl: (q) => `paramountplus://search?query=${q}`,
  },
  {
    matchRegex: /hotstar|jio/i,
    badgeColor: '#0C1826',
    getWebUrl: (q) => `https://www.hotstar.com/in/explore?search_query=${q}`,
    getAppUrl: (q) => `hotstar://search?q=${q}`,
  },
  {
    matchRegex: /youtube/i,
    badgeColor: '#FF0000',
    getWebUrl: (q) => `https://www.youtube.com/results?search_query=${q}`,
    getAppUrl: (q) => `vnd.youtube://results?search_query=${q}`,
  },
  {
    matchRegex: /google/i,
    badgeColor: '#4285F4',
    getWebUrl: (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
    getAppUrl: (q) => `market://search?q=${q}&c=movies`,
  },
  {
    matchRegex: /tubi/i,
    badgeColor: '#FA3222',
    getWebUrl: (q) => `https://tubitv.com/search/${q}`,
  },
  {
    matchRegex: /pluto/i,
    badgeColor: '#FFDF00',
    getWebUrl: (q) => `https://pluto.tv/search/details?q=${q}`,
  },
  {
    matchRegex: /mubi/i,
    badgeColor: '#001428',
    getWebUrl: (q) => `https://mubi.com/search?q=${q}`,
  },
  {
    matchRegex: /criterion/i,
    badgeColor: '#000000',
    getWebUrl: (q) => `https://www.criterionchannel.com/search?q=${q}`,
  },
  {
    matchRegex: /kanopy/i,
    badgeColor: '#BD2B2B',
    getWebUrl: (q) => `https://www.kanopy.com/en/search?query=${q}`,
  },
  {
    matchRegex: /vudu|fandango/i,
    badgeColor: '#0073D2',
    getWebUrl: (q) => `https://www.vudu.com/content/movies/search?searchString=${q}`,
  },
  {
    matchRegex: /starz/i,
    badgeColor: '#000000',
    getWebUrl: (q) => `https://www.starz.com/us/en/search?q=${q}`,
  },
  {
    matchRegex: /amc/i,
    badgeColor: '#000000',
    getWebUrl: (q) => `https://www.amcplus.com/search?q=${q}`,
  },
  {
    matchRegex: /britbox/i,
    badgeColor: '#172740',
    getWebUrl: (q) => `https://www.britbox.com/us/search?q=${q}`,
  },
];

/**
 * Resolves a streaming provider and title to direct search and app URLs.
 * Never redirects to aggregator sites like themoviedb.org or justwatch.com.
 */
export function resolveStreamingUrls(
  providerName: string,
  mediaTitle: string,
  type: 'stream' | 'rent' | 'buy' = 'stream'
): ResolvedStreamingLink {
  const cleanTitle = (mediaTitle || '').trim();
  const encodedTitle = encodeURIComponent(cleanTitle);
  const cleanName = (providerName || '').trim();

  // Find matching platform config
  for (const config of PLATFORM_CONFIGS) {
    if (config.matchRegex.test(cleanName)) {
      return {
        webUrl: config.getWebUrl(encodedTitle, type),
        appUrl: config.getAppUrl ? config.getAppUrl(encodedTitle, type) : undefined,
        badgeColor: config.badgeColor,
      };
    }
  }

  // Safe fallback for unlisted / independent streaming providers:
  // Direct Google Watch query which renders immediate local platform cards
  const encodedProvider = encodeURIComponent(cleanName);
  return {
    webUrl: `https://www.google.com/search?q=watch+${encodedTitle}+on+${encodedProvider}`,
    badgeColor: '#1A1A24',
  };
}

/**
 * Validates whether an existing URL is a direct platform destination
 * rather than a third-party referral site (themoviedb.org, justwatch.com).
 */
export function isDirectStreamingUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return !lower.includes('themoviedb.org') && !lower.includes('justwatch.com');
}
