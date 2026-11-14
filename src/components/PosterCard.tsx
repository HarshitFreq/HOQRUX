import React, { memo, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { MediaItem } from '../services/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTracking } from '../context/TrackingContext';

interface PosterCardProps {
  item: MediaItem;
  width?: number;
  showProgress?: boolean;
  style?: ViewStyle;
  onPress?: (item: MediaItem) => void;
}

export const PosterCard: React.FC<PosterCardProps> = memo(({
  item,
  width = 120,
  showProgress = true,
  style,
  onPress,
}) => {
  const { getTrackingForTitle, getShowProgress, cacheMediaItem } = useTracking();
  const [imageError, setImageError] = useState(false);
  const trackingRecord = getTrackingForTitle(item.id);
  const isCompleted = trackingRecord?.status === 'completed';

  const height = width * 1.5; // Standard 2:3 cinema proportion

  const progress = item.type === 'tv' && showProgress ? getShowProgress(item) : null;

  const handlePress = useCallback(() => {
    cacheMediaItem(item);
    if (onPress) {
      onPress(item);
    } else {
      router.push({
        pathname: '/title/[id]',
        params: { id: item.id },
      });
    }
  }, [item, cacheMediaItem, onPress]);

  const ratingValue = item.imdbRating || item.tmdbRating;

  // Zero-Latency optimization: Automatically rewrite TMDb image resolution to w342
  // for small poster cards in horizontal rows to eliminate network lag and stutter
  const optimizedPosterUri = useMemo(() => {
    if (!item.posterPath) return '';
    if (width <= 160 && item.posterPath.includes('image.tmdb.org/t/p/')) {
      return item.posterPath.replace(/\/t\/p\/(w\d+|original)\//, '/t/p/w342/');
    }
    return item.posterPath;
  }, [item.posterPath, width]);

  const hasPoster = Boolean(optimizedPosterUri) && !imageError;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.container, { width }, style]}
    >
      <View style={[styles.imageContainer, { width, height }]}>
        {hasPoster ? (
          <Image
            source={{ uri: optimizedPosterUri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={optimizedPosterUri}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderBadge}>
              <Text
                style={styles.placeholderInitials}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
              >
                {item.title ? item.title.slice(0, 2).toUpperCase() : 'HQ'}
              </Text>
            </View>
          </View>
        )}

        {/* Swiss Corner Badges */}
        <View style={styles.topBadgesRow}>
          {ratingValue ? (
            <View style={styles.ratingBadge}>
              <Text
                style={styles.ratingText}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
              >
                {ratingValue.toFixed(1)}
              </Text>
            </View>
          ) : null}

          {isCompleted && (
            <View style={styles.completedBadge}>
              <Text
                style={styles.completedText}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
              >
                DONE
              </Text>
            </View>
          )}
        </View>

        {/* Hairline Architectural Progress Bar */}
        {progress && progress.watchedCount > 0 && (
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress.percentage}%` },
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text
          style={styles.title}
          numberOfLines={1}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.25}
        >
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={styles.year}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.2}
          >
            {item.releaseYear}
          </Text>
          <Text style={styles.slash}>/</Text>
          <Text
            style={styles.type}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.2}
          >
            {item.type === 'tv' ? 'SERIES' : item.type === 'anime' ? 'ANIME' : 'FILM'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

PosterCard.displayName = 'PosterCard';

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
    marginBottom: 10,
  },
  imageContainer: {
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  placeholderBadge: {
    width: 44,
    height: 44,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  placeholderInitials: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: typography.fontBlack,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  topBadgesRow: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ratingText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: typography.fontBold,
    letterSpacing: Platform.OS === 'ios' ? 0.2 : 0,
    includeFontPadding: false,
  },
  completedBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: typography.fontBlack,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  info: {
    marginTop: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontBold,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  year: {
    color: colors.textSecondary,
    fontSize: 9.5,
    fontFamily: typography.fontMedium,
  },
  slash: {
    color: colors.textMuted,
    marginHorizontal: 4,
    fontSize: 9,
    fontWeight: '600',
  },
  type: {
    color: colors.textMuted,
    fontSize: 8.5,
    fontFamily: typography.fontSemiBold,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
});
