/**
 * Top10Shelf Component
 * 
 * Implements:
 * 1. Top 10 horizontal shelf for /trending/all/day.
 * 2. Giant Rank Numerals (1–10) overlapping the bottom-left edge of each poster,
 *    styled strictly in the user's custom Asimovian font (typography.fontBrand).
 * 3. All other numbers (rating badges, release years, counts) and text remain
 *    strictly in Satoshi typography.
 * 4. Crisp w342 vertical posters with theme borders (colors.border).
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PixelRatio,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MediaItem } from '../services/types';
import { useTracking } from '../context/TrackingContext';

interface Top10ShelfProps {
  items: MediaItem[];
  onSelectTitle?: (item: MediaItem) => void;
}

export const Top10Shelf: React.FC<Top10ShelfProps> = memo(({
  items,
  onSelectTitle,
}) => {
  const { cacheMediaItem } = useTracking();
  const top10 = items.slice(0, 10);

  const handlePress = useCallback(
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

  if (!top10 || top10.length === 0) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleGroup}>
          <Text
            style={styles.sectionTitle}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.25}
          >
            TOP 10 TODAY
          </Text>
          <View style={styles.badgePill}>
            <Text
              style={styles.badgeText}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              TRENDING
            </Text>
          </View>
        </View>
        <Text
          style={styles.countText}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.2}
        >
          10
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfScrollContent}
        decelerationRate="fast"
      >
        {top10.map((item, index) => {
          const rank = index + 1;
          const isNumberOne = rank === 1;

          const posterUri = item.posterPath
            ? item.posterPath.replace(/\/t\/p\/(w\d+|original)\//, '/t/p/w342/')
            : item.posterPath;

          // Dynamic Text Size Support: calibrated against OS accessibility scale, capped at 1.25x
          const fontScale = PixelRatio.getFontScale();
          const baseRankSize = rank === 10 ? 36 : 46;
          const dynamicRankSize = Math.round(baseRankSize * Math.min(fontScale, 1.25));
          const dynamicLineHeight = Math.round(dynamicRankSize * 1.05);
          const containerDim = Math.round(54 * Math.min(fontScale, 1.25));

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => handlePress(item)}
              style={styles.cardContainer}
            >
              <View style={styles.posterWrapper}>
                {/* Poster Image */}
                {posterUri ? (
                  <Image
                    source={{ uri: posterUri }}
                    style={styles.posterImage}
                    contentFit="cover"
                    transition={150}
                    priority="high"
                    cachePolicy="memory-disk"
                    recyclingKey={posterUri}
                  />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    <Text
                      style={styles.placeholderText}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.25}
                    >
                      {item.title ? item.title.slice(0, 2).toUpperCase() : 'HQ'}
                    </Text>
                  </View>
                )}

                {/* TMDb Rating Badge (Strictly Satoshi font) */}
                {item.tmdbRating ? (
                  <View style={styles.ratingBadge}>
                    <Text
                      style={styles.ratingText}
                      allowFontScaling={true}
                      maxFontSizeMultiplier={1.25}
                    >
                      ★ {item.tmdbRating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}

                {/* Stylized Rank Number Overlapping Bottom-Left (Dynamic Size + Asimovian font only) */}
                <View style={[styles.rankNumberContainer, { width: containerDim, height: containerDim }]}>
                  {/* Subtle dark backdrop offset for crisp edge separation */}
                  <Text
                    style={[
                      styles.rankNumberText,
                      styles.rankShadowText,
                      { fontSize: dynamicRankSize, lineHeight: dynamicLineHeight },
                    ]}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.25}
                  >
                    {rank}
                  </Text>
                  <Text
                    style={[
                      styles.rankNumberText,
                      isNumberOne && styles.rankOneText,
                      { fontSize: dynamicRankSize, lineHeight: dynamicLineHeight },
                    ]}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.25}
                  >
                    {rank}
                  </Text>
                </View>
              </View>

              {/* Title & Metadata (Strictly Satoshi font) */}
              <View style={styles.metaContainer}>
                <Text
                  style={styles.titleText}
                  numberOfLines={1}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.25}
                >
                  {item.title}
                </Text>
                <Text
                  style={styles.subText}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.25}
                >
                  {item.releaseYear} • {item.type === 'tv' ? 'SERIES' : 'FILM'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

Top10Shelf.displayName = 'Top10Shelf';

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
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  badgePill: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  countText: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.textMuted,
  },
  shelfScrollContent: {
    paddingLeft: 22,
    paddingRight: 16,
  },
  cardContainer: {
    width: 135,
    marginRight: 16,
  },
  posterWrapper: {
    width: 125,
    height: 187,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'visible', // Allows the giant rank numeral to overlap outside the poster
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: typography.fontBold,
    fontSize: 16,
    color: colors.textMuted,
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  ratingText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textPrimary,
  },
  rankNumberContainer: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 54,
    height: 54,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  rankNumberText: {
    // Custom uploaded Asimovian font applied ONLY for the Giant Rank Numerals
    fontFamily: typography.fontBrand,
    color: colors.textPrimary,
    letterSpacing: -1.5,
  },
  rankShadowText: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    color: colors.void,
    zIndex: -1,
  },
  rankOneText: {
    color: colors.accent,
  },
  metaContainer: {
    marginTop: 12,
    paddingLeft: 2,
  },
  titleText: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.3 : 0,
    includeFontPadding: false,
  },
  subText: {
    fontFamily: typography.fontMedium,
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
