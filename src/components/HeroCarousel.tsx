/**
 * HeroCarousel Component (Swiss Editorial Spotlight)
 * 
 * Distinctive features:
 * 1. Framed architectural canvas with hairline perimeter border (colors.border).
 * 2. Precision Swiss timeline progress counter (01 / 05) with segmented active bar.
 * 3. Left-aligned TitleLogo component with zero-latency SVG/PNG rendering.
 * 4. Technical metadata chips and genre tags in colors.surfaceHighlight.
 * 5. Stark monochromatic primary action + dossier exploration button.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '../utils/haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MediaItem } from '../services/types';
import { NativeTitleLogo } from './NativeTitleLogo';
import { getCanonicalMediaType } from '../services/api/tmdbLogo';
import { useTracking } from '../context/TrackingContext';

interface HeroCarouselProps {
  items: MediaItem[];
  onSelectTitle?: (item: MediaItem) => void;
}

const ROTATION_INTERVAL_MS = 5500;

export const HeroCarousel: React.FC<HeroCarouselProps> = memo(({
  items,
  onSelectTitle,
}) => {
  const top5Items = items.slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    getTrackingForTitle,
    setWatchStatus,
    getShowProgress,
    toggleEpisodeWatched,
    cacheMediaItem,
  } = useTracking();
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [translateXAnim] = useState(() => new Animated.Value(0));
  const isInteracting = useRef(false);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const safeIndex = currentIndex < top5Items.length ? currentIndex : 0;
  const activeItem = top5Items[safeIndex] || top5Items[0];
  const trackingRecord = activeItem ? getTrackingForTitle(activeItem.id) : undefined;
  const isWatchlisted =
    trackingRecord?.status === 'plan_to_watch' || trackingRecord?.status === 'watching';
  const isWatching = trackingRecord?.status === 'watching';
  const isSeries = activeItem?.type === 'tv' || activeItem?.type === 'anime';
  const progress = activeItem && isSeries ? getShowProgress(activeItem) : null;

  const currentSeason = trackingRecord?.lastWatchedSeason || 1;
  const nextEpNum = (trackingRecord?.lastWatchedEpisode || 0) + 1;
  const season = activeItem?.seasons?.find((s) => s.seasonNumber === currentSeason);
  const nextEpData = season?.episodes.find((e) => e.episodeNumber === nextEpNum);

  const transitionToSlide = useCallback(
    (nextIndex: number, direction: 'left' | 'right' = 'left') => {
      const exitX = direction === 'left' ? -35 : 35;
      const enterX = direction === 'left' ? 35 : -35;

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: exitX,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(nextIndex);
        translateXAnim.setValue(enterX);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(translateXAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, translateXAnim]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (top5Items.length <= 1) return false;
          return (
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
          );
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (top5Items.length <= 1) return false;
          return (
            Math.abs(gestureState.dx) > 16 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderGrant: () => {
          isInteracting.current = true;
        },
        onPanResponderRelease: (_, gestureState) => {
          const SWIPE_THRESHOLD = 30;
          const curr = currentIndexRef.current;
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            // Swiped Left -> Next slide
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const nextIndex = (curr + 1) % top5Items.length;
            transitionToSlide(nextIndex, 'left');
          } else if (gestureState.dx > SWIPE_THRESHOLD) {
            // Swiped Right -> Previous slide
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const prevIndex = (curr - 1 + top5Items.length) % top5Items.length;
            transitionToSlide(prevIndex, 'right');
          }
          setTimeout(() => {
            isInteracting.current = false;
          }, 3000);
        },
        onPanResponderTerminate: () => {
          setTimeout(() => {
            isInteracting.current = false;
          }, 3000);
        },
      }),
    [top5Items.length, transitionToSlide]
  );

  // Auto-rotation timer
  useEffect(() => {
    if (top5Items.length <= 1) return;

    const timer = setInterval(() => {
      if (!isInteracting.current) {
        const nextIndex = (currentIndex + 1) % top5Items.length;
        transitionToSlide(nextIndex, 'left');
      }
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [currentIndex, top5Items.length, transitionToSlide]);

  const handleSelectTitle = useCallback(
    (item: MediaItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      cacheMediaItem(item);
      if (onSelectTitle) {
        onSelectTitle(item);
      } else {
        router.push({
          pathname: '/title/[id]',
          params: { id: item.id },
        });
      }
    },
    [onSelectTitle, cacheMediaItem]
  );

  const handleToggleWatchlist = useCallback(
    (item: MediaItem) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const nextStatus = isWatchlisted ? 'dropped' : 'plan_to_watch';
      setWatchStatus(item, nextStatus);
    },
    [isWatchlisted, setWatchStatus]
  );

  const handleLogNextEpisode = useCallback(() => {
    if (!activeItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleEpisodeWatched(
      activeItem,
      currentSeason,
      nextEpNum,
      nextEpData?.title || `Episode ${nextEpNum}`,
      nextEpData?.runtime || 50
    );
  }, [activeItem, currentSeason, nextEpNum, nextEpData, toggleEpisodeWatched]);

  const handleMarkMovieWatched = useCallback(() => {
    if (!activeItem) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWatchStatus(activeItem, 'completed');
  }, [activeItem, setWatchStatus]);

  if (!activeItem) return null;

  const currentNumStr = `0${safeIndex + 1}`;
  const totalNumStr = `0${top5Items.length}`;

  return (
    <View
      style={styles.carouselContainer}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.slideWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateX: translateXAnim }],
          },
        ]}
      >
        {/* Framed Backdrop Container */}
        <View style={styles.backdropContainer}>
          {(activeItem.backdropPath || activeItem.posterPath) ? (
            <Image
              source={{ uri: activeItem.backdropPath || activeItem.posterPath }}
              style={styles.backdropImage}
              contentFit="cover"
              priority="high"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.backdropPlaceholder} />
          )}

          {/* Smooth Linear Gradient Overlays Fading Into colors.void (NO glassmorphism, NO hard cutoffs) */}
          <LinearGradient
            colors={['rgba(5, 5, 7, 0.65)', 'rgba(5, 5, 7, 0.15)', 'transparent']}
            locations={[0, 0.5, 1]}
            style={styles.topVignette}
          />
          <LinearGradient
            colors={['transparent', 'rgba(5, 5, 7, 0.7)', colors.void]}
            locations={[0, 0.45, 1]}
            style={styles.bottomVignette}
          />
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={['rgba(5, 5, 7, 0.75)', 'rgba(5, 5, 7, 0.25)', 'transparent']}
            locations={[0, 0.5, 1]}
            style={styles.leftVignette}
          />
        </View>

        {/* Content Container: Left-aligned TitleLogo & Info */}
        <View style={styles.contentOverlay}>
          {/* Spotlight & Rank Tag */}
          <View style={styles.tagRow}>
            <View style={styles.spotlightPill}>
              <View style={styles.redDot} />
              <Text
                style={styles.spotlightText}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
              >
                {isWatching && isSeries
                  ? `NOW WATCHING // ${currentNumStr}`
                  : !isSeries
                  ? `WANT TO WATCH // ${currentNumStr}`
                  : `SPOTLIGHT // ${currentNumStr}`}
              </Text>
            </View>

            {/* Progress Ratio Badge (for series) or Movie Spec */}
            {progress && isSeries ? (
              <View style={styles.ratioBadge}>
                <Text
                  style={styles.ratioBadgeText}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {progress.watchedCount}/{progress.totalCount} EPS ({progress.percentage}%)
                </Text>
              </View>
            ) : !isSeries ? (
              <View style={styles.ratioBadge}>
                <Text
                  style={styles.ratioBadgeText}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {activeItem.runtime ? `${activeItem.runtime} MIN` : 'WANT TO WATCH'}
                </Text>
              </View>
            ) : activeItem.tmdbRating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color={colors.starYellow} />
                <Text
                  style={styles.ratingText}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {activeItem.tmdbRating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Left-Aligned Stylized TitleLogo */}
          <View style={styles.logoWrapper}>
            <NativeTitleLogo
              mediaType={getCanonicalMediaType(activeItem)}
              id={activeItem.tmdbId || activeItem.id}
              title={activeItem.title}
              originalLanguage={activeItem.originalLanguage}
              isHero={true}
              containerStyle={styles.logoContainer}
            />
          </View>

          {/* Next Up Episode Pill (if series & watching) */}
          {isWatching && isSeries && (
            <View style={styles.nextEpPill}>
              <Ionicons name="play" size={8.5} color={colors.accent} style={{ marginRight: 5 }} />
              <Text
                style={styles.nextEpPillText}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                NEXT: S{currentSeason}:E{nextEpNum} • {nextEpData?.title || `Episode ${nextEpNum}`}
              </Text>
            </View>
          )}

          {/* Progress Bar (if series & watching) */}
          {progress && isWatching && (
            <View style={styles.spotlightProgressBar}>
              <View
                style={[
                  styles.spotlightProgressFill,
                  { width: `${Math.max(4, progress.percentage)}%` },
                ]}
              />
            </View>
          )}

          {/* Genre & Meta Tags */}
          <View style={styles.metaRow}>
            <Text
              style={styles.yearText}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              {activeItem.releaseYear}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text
              style={styles.typeText}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              {activeItem.type === 'tv' ? 'SERIES' : 'FEATURE FILM'}
            </Text>

            {activeItem.genres && activeItem.genres.length > 0 && (
              <>
                <Text style={styles.dotSeparator}>•</Text>
                <View style={styles.genreTagsContainer}>
                  {activeItem.genres.slice(0, 2).map((genre) => (
                    <View key={genre} style={styles.genrePill}>
                      <Text
                        style={styles.genreText}
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.2}
                      >
                        {genre.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {isWatching && isSeries ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleLogNextEpisode}
                style={styles.primaryLogButton}
              >
                <Ionicons name="checkmark-sharp" size={13} color={colors.swissBlack} />
                <Text
                  style={styles.primaryButtonText}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  LOG E{nextEpNum}
                </Text>
              </TouchableOpacity>
            ) : !isSeries ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleMarkMovieWatched}
                style={styles.primaryLogButton}
              >
                <Ionicons name="checkmark-sharp" size={13} color={colors.swissBlack} />
                <Text
                  style={styles.primaryButtonText}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  LOG FILM
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleToggleWatchlist(activeItem)}
                style={[
                  styles.primaryWatchlistButton,
                  isWatchlisted && styles.watchlistedActiveButton,
                ]}
              >
                <Ionicons
                  name={isWatchlisted ? 'checkmark' : 'bookmark-outline'}
                  size={13}
                  color={isWatchlisted ? colors.accent : colors.swissBlack}
                />
                <Text
                  style={[
                    styles.primaryButtonText,
                    isWatchlisted && styles.watchlistedButtonText,
                  ]}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {isWatchlisted ? 'IN WATCHLIST' : 'ADD TO LIST'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Secondary Details Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectTitle(activeItem)}
              style={styles.secondaryDetailsButton}
            >
              <Ionicons
                name={isWatching && isSeries ? 'list' : 'arrow-forward'}
                size={13}
                color={colors.textPrimary}
              />
              <Text
                style={styles.secondaryButtonText}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
              >
                {isWatching && isSeries ? 'EPISODES' : 'DETAILS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Swiss Architectural Counter & Timeline Track */}
      <View style={styles.timelineRow}>
        <Text
          style={styles.counterText}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.2}
        >
          {currentNumStr} <Text style={styles.counterDivider}>/</Text> {totalNumStr}
        </Text>
        <View style={styles.timelineTrack}>
          {top5Items.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => transitionToSlide(idx, idx >= currentIndex ? 'left' : 'right')}
                style={[
                  styles.timelineSegment,
                  isActive && styles.timelineSegmentActive,
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
});

HeroCarousel.displayName = 'HeroCarousel';

const styles = StyleSheet.create({
  carouselContainer: {
    position: 'relative',
    minHeight: 375,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  slideWrapper: {
    width: '100%',
    minHeight: 375,
    justifyContent: 'flex-end',
  },
  backdropContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surfaceElevated,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.65,
  },
  backdropPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  leftVignette: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 140,
  },
  contentOverlay: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    zIndex: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  spotlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  redDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  spotlightText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 2,
  },
  ratingText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    marginLeft: 4,
    includeFontPadding: false,
  },
  logoWrapper: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  fallbackTitleText: {
    fontFamily: typography.fontBlack,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    lineHeight: 35,
    includeFontPadding: false,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  yearText: {
    fontFamily: typography.fontMedium,
    fontSize: 10.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  dotSeparator: {
    color: colors.textMuted,
    marginHorizontal: 6,
    fontSize: 10,
  },
  typeText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  genreTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genrePill: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 5,
  },
  genreText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  overviewText: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryWatchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
    marginRight: 8,
  },
  primaryLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 2,
    marginRight: 8,
  },
  primaryLoggedButton: {
    backgroundColor: 'rgba(255, 30, 0, 0.12)',
    borderColor: colors.accentBorder,
    borderWidth: 1,
  },
  ratioBadge: {
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 2,
  },
  ratioBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  nextEpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    marginBottom: 6,
    maxWidth: '92%',
  },
  nextEpPillText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.2 : 0,
    includeFontPadding: false,
  },
  spotlightProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 1.5,
    marginBottom: 8,
    width: '100%',
    overflow: 'hidden',
  },
  spotlightProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 1.5,
  },
  watchlistedActiveButton: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  primaryButtonText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.swissBlack,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginLeft: 5,
  },
  watchlistedButtonText: {
    color: colors.textPrimary,
  },
  secondaryDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
  },
  secondaryButtonText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginLeft: 4,
  },
  timelineRow: {
    position: 'absolute',
    bottom: 8,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: {
    fontFamily: typography.fontBlack,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
    marginRight: 8,
  },
  counterDivider: {
    color: colors.textMuted,
    fontSize: 8,
  },
  timelineTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 7, 0.7)',
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: 2,
    padding: 2,
  },
  timelineSegment: {
    width: 14,
    height: 3,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 1,
    marginHorizontal: 1.5,
  },
  timelineSegmentActive: {
    width: 22,
    backgroundColor: colors.accent,
  },
});
