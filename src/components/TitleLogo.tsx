import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTitleLogo,
  getCachedLogo,
  getCachedLogoAspectRatio,
  extractBestLogo,
  getAdaptiveLogoHeight,
  getAdaptiveFallbackTitleStyle,
  TmdbLogo,
} from '../services/api/tmdbLogo';

export interface TitleLogoProps {
  /** Media type: 'movie' | 'tv' | 'anime' */
  mediaType: 'movie' | 'tv' | 'anime';
  /** TMDb title ID */
  id: number | string;
  /** Plain text title used for alt description and the <h1> fallback */
  title: string;
  /** Optional ISO-639-1 language code (e.g. 'ja', 'ko', 'es') for foreign titles */
  originalLanguage?: string;
  /** Optional TMDb API key override */
  apiKey?: string;
  /** Optional pre-fetched logos array (avoids network requests entirely) */
  preloadedLogos?: TmdbLogo[];
  /** Optional pre-resolved logo URL */
  initialLogoUrl?: string;
  /** Custom CSS class for the <img> tag */
  className?: string;
  /** Custom inline styles for the <img> tag */
  style?: React.CSSProperties;
  /** Custom CSS class for the fallback <h1> tag */
  fallbackClassName?: string;
  /** Custom inline styles for the fallback <h1> tag */
  fallbackStyle?: React.CSSProperties;
  /** Responsive max-height (defaults to '120px' or '130px' for hero banners) */
  maxHeight?: string | number;
  /** Responsive max-width (defaults to '88%') */
  maxWidth?: string | number;
  /** Whether the logo is placed inside a hero banner */
  isHero?: boolean;
  /** Accessible alt text (defaults to `${title} logo`) */
  alt?: string;
}

/**
 * Reusable TitleLogo UI Component
 * 
 * Sizing & Animation:
 * - Mobile logo max-height: 120px (or 130px for hero banners), max-width: 88%.
 * - Proportional fallback title: 28px-34px, bold/extra-bold weight, tight line-height 1.1.
 * - Smooth entrance: starts at opacity: 0 and scale: 0.96, transitioning to opacity: 1 and scale: 1
 *   over 380ms ease-out on image load (or immediately on fallback text title).
 * 
 * Optimized for zero latency via synchronous cache pre-checks, eager image loading,
 * and high fetch priority.
 */
export const TitleLogo: React.FC<TitleLogoProps> = ({
  mediaType,
  id,
  title,
  originalLanguage,
  apiKey,
  preloadedLogos,
  initialLogoUrl,
  className,
  style,
  fallbackClassName,
  fallbackStyle,
  maxHeight,
  maxWidth = '88%',
  isHero = false,
  alt,
}) => {
  const cachedAspect = useMemo(() => {
    if (preloadedLogos && preloadedLogos.length > 0 && preloadedLogos[0].aspect_ratio > 0) {
      return preloadedLogos[0].aspect_ratio;
    }
    return getCachedLogoAspectRatio(mediaType, id);
  }, [preloadedLogos, mediaType, id]);

  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const effectiveAspectRatio = aspectRatio ?? cachedAspect;

  const adaptiveSizing = useMemo(() => {
    const numMaxHeight = typeof maxHeight === 'number' ? maxHeight : undefined;
    return getAdaptiveLogoHeight(effectiveAspectRatio, isHero, numMaxHeight);
  }, [effectiveAspectRatio, isHero, maxHeight]);

  const adaptiveFallback = useMemo(() => {
    return getAdaptiveFallbackTitleStyle(title, isHero);
  }, [title, isHero]);

  // 1. Zero-Latency Synchronous Resolution:
  // Derived directly during render from props or dual-layer cache (In-Memory + sessionStorage).
  const cachedOrPreloadedUrl = useMemo(() => {
    if (initialLogoUrl) return initialLogoUrl;
    if (preloadedLogos && preloadedLogos.length > 0) {
      return extractBestLogo(preloadedLogos, originalLanguage);
    }
    const cached = getCachedLogo(mediaType, id);
    return cached !== undefined ? cached : undefined;
  }, [initialLogoUrl, preloadedLogos, originalLanguage, mediaType, id]);

  // Async state for background fetching when not present in synchronous cache
  const [asyncLogoUrl, setAsyncLogoUrl] = useState<string | null | undefined>(undefined);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [prevId, setPrevId] = useState(id);

  // Synchronously adjust state during render when ID changes (official React pattern)
  if (prevId !== id) {
    setPrevId(id);
    setHasError(false);
    setIsLoaded(false);
    setAspectRatio(undefined);
  }

  // Effective logo URL: preloaded/cache takes precedence, followed by async result
  const logoUrl = cachedOrPreloadedUrl !== undefined ? cachedOrPreloadedUrl : asyncLogoUrl;
  const isPending = cachedOrPreloadedUrl === undefined && asyncLogoUrl === undefined;

  // Single-request background fetch only if missing from cache
  useEffect(() => {
    if (cachedOrPreloadedUrl !== undefined) {
      return;
    }

    const controller = new AbortController();

    fetchTitleLogo(mediaType, id, {
      apiKey,
      originalLanguage,
      title,
      signal: controller.signal,
    })
      .then((url) => {
        setAsyncLogoUrl(url);
      })
      .catch(() => {
        setHasError(true);
      });

    return () => {
      controller.abort();
    };
  }, [mediaType, id, originalLanguage, apiKey, title, cachedOrPreloadedUrl]);

  // Smooth entrance transition for fallback title when no logo is available
  useEffect(() => {
    if (hasError || (!logoUrl && !isPending)) {
      const timer = setTimeout(() => setIsLoaded(true), 20);
      return () => clearTimeout(timer);
    }
  }, [hasError, logoUrl, isPending]);

  // Fallback: Plain text <h1> with dynamic length-based font scaling
  const renderFallbackTitle = () => (
    <h1
      className={fallbackClassName}
      style={{
        margin: 0,
        fontSize: `${adaptiveFallback.fontSize}px`,
        fontWeight: 800,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#FFFFFF',
        letterSpacing: '-0.02em',
        lineHeight: `${adaptiveFallback.lineHeight}px`,
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.85)',
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'scale(1)' : 'scale(0.96)',
        transformOrigin: 'left bottom',
        transition: 'opacity 380ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
        maxWidth: typeof adaptiveSizing.maxWidth === 'number' ? `${adaptiveSizing.maxWidth}px` : adaptiveSizing.maxWidth,
        ...fallbackStyle,
      }}
    >
      {title}
    </h1>
  );

  // If image errored, fetch finished with no logo, or pending initial fetch: render fallback text
  if (hasError || (!logoUrl && !isPending) || !logoUrl) {
    return renderFallbackTitle();
  }

  const finalHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : (typeof maxHeight === 'string' ? maxHeight : `${adaptiveSizing.height}px`);
  const finalMaxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : (typeof maxWidth === 'string' ? maxWidth : adaptiveSizing.maxWidth);

  return (
    <img
      src={logoUrl}
      alt={alt || `${title} logo`}
      loading="eager"
      // fetchPriority for modern browsers, fetchpriority HTML attribute fallback
      fetchPriority="high"
      {...({ fetchpriority: 'high' } as Record<string, string>)}
      className={className}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setAspectRatio(img.naturalWidth / img.naturalHeight);
        }
        setIsLoaded(true);
      }}
      style={{
        maxHeight: finalHeight,
        maxWidth: finalMaxWidth,
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        // Subtle layered drop-shadow filter ensures dark/transparent logos remain legible over dark backdrops
        filter: 'drop-shadow(0px 2px 8px rgba(0, 0, 0, 0.75)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.95))',
        display: 'inline-block',
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'scale(1)' : 'scale(0.96)',
        transformOrigin: 'left bottom',
        transition: 'opacity 380ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
      onError={() => {
        // Automatic graceful fallback to <h1> if the image fails to load
        setHasError(true);
      }}
    />
  );
};

export default TitleLogo;
