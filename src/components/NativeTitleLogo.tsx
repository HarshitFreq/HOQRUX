import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  Image,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
  View,
  Platform,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import {
  fetchTitleLogo,
  getCachedLogo,
  getCachedLogoAspectRatio,
  extractBestLogo,
  getAdaptiveLogoHeight,
  getAdaptiveFallbackTitleStyle,
  TmdbLogo,
} from '../services/api/tmdbLogo';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export interface NativeTitleLogoProps {
  mediaType: 'movie' | 'tv' | 'anime';
  id: number | string;
  title: string;
  originalLanguage?: string;
  apiKey?: string;
  preloadedLogos?: TmdbLogo[];
  initialLogoUrl?: string;
  maxHeight?: number;
  isHero?: boolean;
  containerStyle?: ViewStyle;
  fallbackTextStyle?: TextStyle;
}

/**
 * NativeTitleLogo UI Component for React Native / Expo
 * 
 * Features:
 * - Robust mobile scaling: calibrated to screen context and intrinsic aspect ratio.
 * - Zero-latency cache resolution: displays instantly when cached.
 * - Automatic SVG-to-PNG fallback on network/rendering error.
 * - Ambient contrast illumination: guarantees 100% visibility for dark/black studio logos on #050507.
 * - Smooth entrance transition with zero invisible-delay bugs.
 */
export const NativeTitleLogo: React.FC<NativeTitleLogoProps> = ({
  mediaType,
  id,
  title,
  originalLanguage,
  apiKey,
  preloadedLogos,
  initialLogoUrl,
  maxHeight,
  isHero = false,
  containerStyle,
  fallbackTextStyle,
}) => {
  const cachedAspect = useMemo(() => {
    if (preloadedLogos && preloadedLogos.length > 0 && preloadedLogos[0].aspect_ratio > 0) {
      return preloadedLogos[0].aspect_ratio;
    }
    return getCachedLogoAspectRatio(mediaType, id);
  }, [preloadedLogos, mediaType, id]);

  const cachedUrl = useMemo(() => {
    if (initialLogoUrl) return initialLogoUrl;
    if (preloadedLogos && preloadedLogos.length > 0) {
      return extractBestLogo(preloadedLogos, originalLanguage, true);
    }
    const hit = getCachedLogo(mediaType, id);
    return hit !== undefined ? hit : undefined;
  }, [initialLogoUrl, preloadedLogos, originalLanguage, mediaType, id]);

  const [asyncLogoUrl, setAsyncLogoUrl] = useState<string | null | undefined>(undefined);
  const [hasError, setHasError] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(cachedAspect);
  const [svgFallbackTriggered, setSvgFallbackTriggered] = useState(false);
  const [prevId, setPrevId] = useState(id);
  const [prevMediaType, setPrevMediaType] = useState(mediaType);

  // Animation values: initialized at 1 so logos are never invisible
  const [opacityAnim] = useState(() => new Animated.Value(1));
  const [scaleAnim] = useState(() => new Animated.Value(1));

  // Reset animations and state synchronously when ID or mediaType changes
  if (prevId !== id || prevMediaType !== mediaType) {
    setPrevId(id);
    setPrevMediaType(mediaType);
    setHasError(false);
    setImageLoadFailed(false);
    setSvgFallbackTriggered(false);
    setAsyncLogoUrl(undefined);
    setAspectRatio(cachedAspect);
    opacityAnim.setValue(1);
    scaleAnim.setValue(1);
  }

  const effectiveAspectRatio = aspectRatio ?? cachedAspect;

  // Dynamic optical sizing based on intrinsic aspect ratio and context
  const adaptiveSizing = useMemo(() => {
    return getAdaptiveLogoHeight(effectiveAspectRatio, isHero, maxHeight);
  }, [effectiveAspectRatio, isHero, maxHeight]);

  // Dynamic fallback title typography based on character count
  const adaptiveFallback = useMemo(() => {
    return getAdaptiveFallbackTitleStyle(title, isHero);
  }, [title, isHero]);

  const activeUrl = cachedUrl !== undefined ? cachedUrl : asyncLogoUrl;

  const triggerEntrance = useCallback(() => {
    opacityAnim.setValue(1);
    scaleAnim.setValue(0.97);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [opacityAnim, scaleAnim]);

  // Pre-fetch aspect ratio for bitmap images
  useEffect(() => {
    if (activeUrl && !activeUrl.toLowerCase().endsWith('.svg')) {
      Image.getSize(
        activeUrl,
        (w, h) => {
          if (w > 0 && h > 0) {
            setAspectRatio(w / h);
          }
        },
        () => {
          // If image fails sizing, continue
        }
      );
    }
  }, [activeUrl]);

  // Fetch title logo asynchronously if not cached
  useEffect(() => {
    if (cachedUrl !== undefined) {
      return;
    }

    let isMounted = true;
    fetchTitleLogo(mediaType, id, {
      apiKey,
      originalLanguage,
      title,
      preferPng: true, // Prioritize crisp hardware-decoded PNGs for React Native
    })
      .then((url) => {
        if (!isMounted) return;
        setAsyncLogoUrl(url);
        if (url) {
          setHasError(false);
          setImageLoadFailed(false);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [mediaType, id, originalLanguage, apiKey, title, cachedUrl]);

  const isPending = cachedUrl === undefined && asyncLogoUrl === undefined;

  // Ensure visible as soon as activeUrl arrives
  useEffect(() => {
    if (activeUrl) {
      opacityAnim.setValue(1);
    }
  }, [activeUrl, opacityAnim]);

  // Handle SVG error: attempt fallback to PNG
  const handleSvgError = useCallback(() => {
    if (activeUrl && activeUrl.toLowerCase().endsWith('.svg') && !svgFallbackTriggered) {
      setSvgFallbackTriggered(true);
      // Construct PNG URL from TMDb CDN
      const pngUrl = activeUrl
        .replace('/original/', '/w500/')
        .replace(/\.svg$/i, '.png');
      setAsyncLogoUrl(pngUrl);
    } else {
      setImageLoadFailed(true);
    }
  }, [activeUrl, svgFallbackTriggered]);

  // Fallback condition:
  // Render fallback title only when:
  // 1. Image loading failed (<Image onError>)
  // 2. OR fetchTitleLogo finished and confirmed no logo exists (activeUrl === null && !isPending)
  // 3. OR fetch failed and no valid URL exists
  const shouldShowFallback = imageLoadFailed || (activeUrl === null && !isPending) || (hasError && !activeUrl);

  if (shouldShowFallback || !activeUrl) {
    return (
      <View
        style={[
          styles.container,
          { maxWidth: adaptiveSizing.maxWidth },
          containerStyle,
        ]}
      >
        <Text
          style={[
            styles.fallbackTitle,
            {
              fontSize: adaptiveFallback.fontSize,
              lineHeight: adaptiveFallback.lineHeight,
            },
            fallbackTextStyle,
          ]}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.25}
        >
          {title}
        </Text>
      </View>
    );
  }

  const isSvg = activeUrl.toLowerCase().endsWith('.svg');

  return (
    <Animated.View
      style={[
        styles.container,
        { maxWidth: adaptiveSizing.maxWidth },
        containerStyle,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {isSvg ? (
        <SvgUri
          uri={activeUrl}
          width={
            effectiveAspectRatio
              ? Math.min(adaptiveSizing.height * effectiveAspectRatio, 340)
              : 260
          }
          height={adaptiveSizing.height}
          onLoad={triggerEntrance}
          onError={handleSvgError}
        />
      ) : (
        <Image
          source={{ uri: activeUrl }}
          style={[
            styles.pngLogo,
            {
              height: adaptiveSizing.height,
              ...(effectiveAspectRatio
                ? { aspectRatio: effectiveAspectRatio }
                : { width: 260 }),
            },
          ]}
          resizeMode="contain"
          onLoad={(e) => {
            if (e.nativeEvent?.source) {
              const { width, height } = e.nativeEvent.source;
              if (width > 0 && height > 0) {
                setAspectRatio(width / height);
              }
            }
            triggerEntrance();
          }}
          onError={() => {
            setImageLoadFailed(true);
          }}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '92%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginVertical: 4,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  pngLogo: {
    width: 260,
    maxWidth: '100%',
    zIndex: 1,
    marginHorizontal: 4,
    marginVertical: 2,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({ filter: 'drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.7))' } as any)
      : {}),
  },
  fallbackTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    fontFamily: typography.fontBlack,
    letterSpacing: -0.5,
    lineHeight: 35,
    includeFontPadding: false,
  },
});

export default NativeTitleLogo;
