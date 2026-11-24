import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { CollectionInfo, CollectionPart } from '../services/types';
import { useTracking } from '../context/TrackingContext';

interface FranchiseCollectionCardProps {
  collection: CollectionInfo;
  currentTmdbId?: number;
}

export const FranchiseCollectionCard: React.FC<FranchiseCollectionCardProps> = ({
  collection,
  currentTmdbId,
}) => {
  const { tracking } = useTracking();

  // Determine watch status for each part in the franchise
  const partsWithWatchedStatus = useMemo(() => {
    return collection.parts.map((part) => {
      const trackingRecord =
        tracking[`movie-${part.id}`] ||
        tracking[String(part.id)] ||
        tracking[`tmdb-${part.id}`];

      const isWatched =
        trackingRecord?.status === 'completed' ||
        Boolean(trackingRecord?.completedAt);

      return {
        ...part,
        isWatched,
      };
    });
  }, [collection.parts, tracking]);

  // Franchise completion calculations
  const totalParts = collection.parts.length;
  const watchedCount = partsWithWatchedStatus.filter((p) => p.isWatched).length;
  const completionPercentage =
    totalParts > 0 ? Math.round((watchedCount / totalParts) * 100) : 0;

  const handleSelectMovie = (part: CollectionPart) => {
    if (part.id === currentTmdbId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/title/[id]',
      params: { id: `movie-${part.id}` },
    });
  };

  if (!collection || collection.parts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header Info & Franchise Completion Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.subBadgeRow}>
            <View style={styles.accentDot} />
            <Text
              style={styles.subLabel}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              FRANCHISE TIMELINE
            </Text>
          </View>
          <Text
            style={styles.collectionTitle}
            numberOfLines={1}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.25}
          >
            Part of {collection.name}
          </Text>
        </View>

        <View style={styles.completionPill}>
          <Text
            style={styles.completionText}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.2}
          >
            {watchedCount} of {totalParts} Watched
          </Text>
        </View>
      </View>

      {/* Sleek Completion Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.max(completionPercentage, watchedCount > 0 ? 5 : 0)}%` },
          ]}
        />
      </View>

      {/* Horizontal Scrollable Chronological Timeline */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroll}
      >
        {partsWithWatchedStatus.map((part) => {
          const isCurrent = part.id === currentTmdbId;

          return (
            <TouchableOpacity
              key={part.id}
              style={[
                styles.movieCard,
                isCurrent && styles.movieCardActive,
              ]}
              onPress={() => handleSelectMovie(part)}
              activeOpacity={0.8}
            >
              {/* Poster Container */}
              <View
                style={[
                  styles.posterContainer,
                  isCurrent && styles.posterContainerActive,
                ]}
              >
                {part.posterPath ? (
                  <Image
                    source={{ uri: part.posterPath }}
                    style={styles.posterImage}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    recyclingKey={part.posterPath}
                  />
                ) : (
                  <View style={styles.posterFallback}>
                    <Ionicons name="film-outline" size={24} color={colors.textMuted} />
                  </View>
                )}

                {/* Numbered Order Pill (#1, #2, etc.) or 'Coming Soon' Badge */}
                <View style={styles.orderBadge}>
                  {part.isComingSoon ? (
                    <View style={styles.comingSoonPill}>
                      <Text
                        style={styles.comingSoonText}
                        allowFontScaling={true}
                        maxFontSizeMultiplier={1.2}
                      >
                        COMING SOON
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={styles.orderBadgeText}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.2}
                    >
                      #{part.orderIndex}
                    </Text>
                  )}
                </View>

                {/* Watched Checkmark Badge on Completed Entries */}
                {part.isWatched && (
                  <View style={styles.watchedCheckBadge}>
                    <Ionicons
                      name="checkmark"
                      size={11}
                      color={colors.swissWhite}
                    />
                  </View>
                )}

                {/* Active Highlight Bottom Tag */}
                {isCurrent && (
                  <View style={styles.currentIndicator}>
                    <Text
                      style={styles.currentIndicatorText}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.2}
                    >
                      CURRENT
                    </Text>
                  </View>
                )}
              </View>

              {/* Title & Release Year */}
              <View style={styles.metaContainer}>
                <Text
                  style={styles.releaseYear}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {part.releaseYear ? String(part.releaseYear) : 'TBA'}
                </Text>
                <Text
                  style={[
                    styles.movieTitle,
                    isCurrent && styles.movieTitleActive,
                  ]}
                  numberOfLines={2}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {part.title}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  subBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  accentDot: {
    width: 5,
    height: 5,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  subLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  collectionTitle: {
    fontFamily: typography.fontBold,
    fontSize: 14,
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  completionPill: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completionText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.accent,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  timelineScroll: {
    paddingHorizontal: 14,
    gap: 12,
  },
  movieCard: {
    width: 108,
  },
  movieCardActive: {
    opacity: 1,
  },
  posterContainer: {
    width: 108,
    height: 156,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  posterContainerActive: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  orderBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textPrimary,
  },
  comingSoonPill: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  comingSoonText: {
    fontFamily: typography.fontBold,
    fontSize: 7.5,
    letterSpacing: 0.6,
    color: colors.accent,
  },
  watchedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.accent,
    paddingVertical: 2,
    alignItems: 'center',
  },
  currentIndicatorText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    letterSpacing: 0.8,
    color: colors.swissWhite,
  },
  metaContainer: {
    marginTop: 6,
  },
  releaseYear: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  movieTitle: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  movieTitleActive: {
    color: colors.textPrimary,
  },
});
