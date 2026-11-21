/**
 * ContinueWatchingShelf Component (Swiss Logbook Reel Shelf)
 * 
 * Distinctive personal tracker features:
 * - 16:9 landscape cards with w500 backdrops and cassette frame styling.
 * - Technical index badge: REEL // S{season}:E{episode}.
 * - Ratio progress tracker (e.g. 5/12 EPS • 42%).
 * - Tactical 'LOG E{X}' instant action button.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MediaItem } from '../services/types';
import { useTracking } from '../context/TrackingContext';
import { NativeTitleLogo } from './NativeTitleLogo';
import { getCanonicalMediaType } from '../services/api/tmdbLogo';

interface ContinueWatchingShelfProps {
  items: MediaItem[];
}

export const ContinueWatchingShelf: React.FC<ContinueWatchingShelfProps> = memo(({
  items,
}) => {
  const { tracking, getShowProgress, toggleEpisodeWatched, setWatchStatus } = useTracking();

  // Strictly filter out any completed films or 100% completed series
  const ongoingItems = useMemo(() => {
    return (items || []).filter((item) => {
      const rec = tracking[item.id];
      if (rec?.status === 'completed') return false;
      if (item.type !== 'movie') {
        const progress = getShowProgress(item);
        if (progress.percentage === 100) return false;
      }
      return true;
    });
  }, [items, tracking, getShowProgress]);

  const handleMarkWatched = useCallback(
    (item: MediaItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const rec = tracking[item.id];
      const sNum = rec?.lastWatchedSeason || 1;
      const nextEpNum = (rec?.lastWatchedEpisode || 0) + 1;

      const season = item.seasons?.find((s) => s.seasonNumber === sNum);
      const ep = season?.episodes.find((e) => e.episodeNumber === nextEpNum);

      toggleEpisodeWatched(
        item,
        sNum,
        nextEpNum,
        ep?.title || `Episode ${nextEpNum}`,
        ep?.runtime || 50
      );
    },
    [tracking, toggleEpisodeWatched]
  );

  const handleMovieAction = useCallback(
    (item: MediaItem) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWatchStatus(item, 'completed');
    },
    [setWatchStatus]
  );

  if (!ongoingItems || ongoingItems.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text
          style={styles.sectionTitle}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.25}
        >
          CONTINUE WATCHING
        </Text>
        <Text
          style={styles.countText}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.2}
        >
          {ongoingItems.length} {ongoingItems.length === 1 ? 'TITLE' : 'TITLES'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfScrollContent}
        decelerationRate="fast"
      >
        {ongoingItems.map((item: MediaItem) => {
          const rec = tracking[item.id];
          const isMovie = item.type === 'movie';
          const progress = getShowProgress(item);
          const currentSeason = rec?.lastWatchedSeason || 1;
          const nextEp = (rec?.lastWatchedEpisode || 0) + 1;

          const season = item.seasons?.find((s) => s.seasonNumber === currentSeason);
          const epData = season?.episodes.find((e) => e.episodeNumber === nextEp);

          const defaultBackdrop = item.backdropPath
            ? item.backdropPath.replace(/\/t\/p\/(w\d+|original)\//, '/t/p/w500/')
            : item.posterPath;

          const displayedThumbnail = (!isMovie && epData?.stillPath)
            ? epData.stillPath
            : defaultBackdrop;

          return (
            <View key={item.id} style={styles.landscapeCard}>
              {/* 16:9 Backdrop Container */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push({ pathname: '/title/[id]', params: { id: item.id } })
                }
                style={styles.backdropWrapper}
              >
                {displayedThumbnail ? (
                  <Image
                    source={{ uri: displayedThumbnail }}
                    style={styles.backdropImage}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    recyclingKey={displayedThumbnail}
                  />
                ) : (
                  <View style={styles.placeholderBackdrop} />
                )}

                {/* Subtle dark gradient overlay */}
                <View style={styles.cardGradientOverlay} />

                {/* Bottom gradient vignette for logo contrast */}
                <LinearGradient
                  colors={['transparent', 'rgba(5, 5, 7, 0.4)', 'rgba(5, 5, 7, 0.88)']}
                  style={styles.logoGradientOverlay}
                />

                {/* Overlaid Title Treatment Logo */}
                <View style={styles.thumbnailLogoContainer} pointerEvents="none">
                  <NativeTitleLogo
                    mediaType={getCanonicalMediaType(item)}
                    id={item.tmdbId || item.id}
                    title={item.title}
                    originalLanguage={item.originalLanguage}
                    maxHeight={26}
                    containerStyle={styles.thumbnailLogo}
                    fallbackTextStyle={styles.thumbnailFallbackTitle}
                  />
                </View>

                {/* Top Right Pill: e.g. 42% or Film */}
                <View style={styles.cardRatioBadge}>
                  <Text
                    style={styles.cardRatioText}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.2}
                  >
                    {isMovie
                      ? 'FILM'
                      : `${progress.percentage}%`}
                  </Text>
                </View>

                {/* Bottom Progress Bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: isMovie
                          ? '0%'
                          : `${Math.max(5, progress.percentage)}%`,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Card Meta & Mark Watched Quick Action */}
              <View style={styles.cardDetails}>
                <TouchableOpacity
                  style={styles.cardTextCol}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({ pathname: '/title/[id]', params: { id: item.id } })
                  }
                >
                  <Text
                    style={styles.itemTitle}
                    numberOfLines={1}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.25}
                  >
                    {isMovie
                      ? item.title
                      : `S${currentSeason} · E${nextEp}${epData?.title ? ` / ${epData.title}` : ''}`}
                  </Text>
                  <Text
                    style={styles.episodeTitle}
                    numberOfLines={1}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.2}
                  >
                    {isMovie
                      ? `${item.releaseYear} • Want to Watch`
                      : item.title}
                  </Text>
                </TouchableOpacity>

                {/* Quick Action Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => (isMovie ? handleMovieAction(item) : handleMarkWatched(item))}
                  style={styles.markWatchedButton}
                >
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={colors.accent}
                  />
                  <Text
                    style={styles.markWatchedText}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.2}
                  >
                    {isMovie ? 'LOG' : `LOG E${nextEp}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

ContinueWatchingShelf.displayName = 'ContinueWatchingShelf';

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0.2,
    includeFontPadding: false,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 2,
    marginLeft: 8,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginRight: 4,
  },
  badgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  countText: {
    fontFamily: typography.fontMedium,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  shelfScrollContent: {
    paddingHorizontal: 16,
  },
  landscapeCard: {
    width: 246,
    marginRight: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backdropWrapper: {
    width: 246,
    height: 138.4, // Exact 16:9 ratio
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBackdrop: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceHighlight,
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 5, 7, 0.28)',
  },
  logoGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  thumbnailLogoContainer: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    maxWidth: 160,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  thumbnailLogo: {
    maxWidth: 160,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  thumbnailFallbackTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardTopBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  cardTopBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  cardRatioBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  cardRatioText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  cardDetails: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
  },
  cardTextCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontFamily: typography.fontBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.2 : 0,
    includeFontPadding: false,
  },
  episodeTitle: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.textSecondary,
    includeFontPadding: false,
    marginTop: 2,
  },
  markWatchedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
  },
  markWatchedButtonDone: {
    backgroundColor: 'rgba(255, 30, 0, 0.08)',
    borderColor: colors.accentBorder,
  },
  markWatchedText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    marginLeft: 3,
    includeFontPadding: false,
  },
});
