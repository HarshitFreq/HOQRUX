/**
 * HomeSkeletons Component
 * 
 * Provides animated shimmer skeleton placeholders matching the Stremio layout:
 * - Full-bleed Hero Carousel Banner
 * - 16:9 Landscape Up Next / Continue Watching cards
 * - Top 10 with overlapping rank numerals
 * - 2:3 Vertical Discovery Poster Rows
 * 
 * Strictly uses theme tokens (colors.surfaceElevated, colors.surfaceHighlight, colors.border)
 * with zero layout shift and native-driver animated pulsing.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

export const ShimmerBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = 2, style }) => {
  const [pulseAnim] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceHighlight,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export const HeroCarouselSkeleton: React.FC = () => {
  return (
    <View style={styles.heroSkeleton}>
      <View style={styles.heroBackdropPlaceholder} />
      <View style={styles.heroContentPlaceholder}>
        {/* Category Pill Placeholder */}
        <ShimmerBox width={120} height={16} borderRadius={2} style={{ marginBottom: 12 }} />
        {/* Title Logo Placeholder */}
        <ShimmerBox width={210} height={44} borderRadius={3} style={{ marginBottom: 12 }} />
        {/* Metadata row */}
        <View style={styles.rowPlaceholder}>
          <ShimmerBox width={45} height={12} borderRadius={2} style={{ marginRight: 8 }} />
          <ShimmerBox width={60} height={12} borderRadius={2} style={{ marginRight: 8 }} />
          <ShimmerBox width={40} height={12} borderRadius={2} />
        </View>
        {/* Buttons Placeholder */}
        <View style={[styles.rowPlaceholder, { marginTop: 14 }]}>
          <ShimmerBox width={110} height={34} borderRadius={2} style={{ marginRight: 10 }} />
          <ShimmerBox width={90} height={34} borderRadius={2} />
        </View>
      </View>
    </View>
  );
};

export const LandscapeRowSkeleton: React.FC<{ title: string }> = () => {
  return (
    <View style={styles.sectionSkeleton}>
      <View style={styles.headerPlaceholder}>
        <ShimmerBox width={150} height={14} borderRadius={2} />
        <ShimmerBox width={30} height={14} borderRadius={2} />
      </View>
      <View style={styles.horizontalShelf}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.landscapeCard}>
            <ShimmerBox width={240} height={135} borderRadius={3} />
            <View style={{ marginTop: 8 }}>
              <ShimmerBox width={180} height={13} borderRadius={2} style={{ marginBottom: 6 }} />
              <ShimmerBox width={120} height={10} borderRadius={2} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const Top10RowSkeleton: React.FC = () => {
  return (
    <View style={styles.sectionSkeleton}>
      <View style={styles.headerPlaceholder}>
        <ShimmerBox width={120} height={14} borderRadius={2} />
        <ShimmerBox width={25} height={14} borderRadius={2} />
      </View>
      <View style={styles.horizontalShelf}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={styles.top10Card}>
            <ShimmerBox width={128} height={192} borderRadius={3} />
            <ShimmerBox width={90} height={11} borderRadius={2} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const PosterRowSkeleton: React.FC<{ title: string }> = () => {
  return (
    <View style={styles.sectionSkeleton}>
      <View style={styles.headerPlaceholder}>
        <ShimmerBox width={140} height={14} borderRadius={2} />
        <ShimmerBox width={25} height={14} borderRadius={2} />
      </View>
      <View style={styles.horizontalShelf}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={styles.posterCard}>
            <ShimmerBox width={116} height={174} borderRadius={3} />
            <ShimmerBox width={85} height={11} borderRadius={2} style={{ marginTop: 6 }} />
            <ShimmerBox width={50} height={9} borderRadius={2} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const DiscoveryShelvesSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <Top10RowSkeleton />
      <PosterRowSkeleton title="POPULAR MOVIES" />
      <PosterRowSkeleton title="TOP RATED SERIES" />
    </View>
  );
};

export const HomeFeedSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <HeroCarouselSkeleton />
      <LandscapeRowSkeleton title="CONTINUE WATCHING" />
      <Top10RowSkeleton />
      <PosterRowSkeleton title="POPULAR MOVIES" />
      <PosterRowSkeleton title="TOP RATED SERIES" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  heroSkeleton: {
    height: 290,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 26,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBackdropPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
  },
  heroContentPlaceholder: {
    padding: 16,
    zIndex: 2,
  },
  rowPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionSkeleton: {
    marginBottom: 26,
  },
  headerPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  horizontalShelf: {
    flexDirection: 'row',
  },
  landscapeCard: {
    marginRight: 12,
  },
  top10Card: {
    marginRight: 18,
  },
  posterCard: {
    marginRight: 10,
  },
});
