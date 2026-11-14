import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MediaItem } from '../services/types';
import { PosterCard } from './PosterCard';
import {
  streamingPlatformService,
  StreamingPlatformRow,
  StreamingPlatformId,
} from '../services/streamingPlatformService';

interface StreamingPlatformFeedProps {
  region?: string;
  onItemPress?: (item: MediaItem) => void;
  showSwitcherHeader?: boolean;
}

const PLATFORM_SWITCHER_OPTIONS: { id: 'all' | StreamingPlatformId; label: string }[] = [
  { id: 'all', label: 'ALL PLATFORMS' },
  { id: 'netflix', label: 'NETFLIX' },
  { id: 'prime', label: 'PRIME VIDEO' },
  { id: 'jiohotstar', label: 'JIOHOTSTAR' },
  { id: 'crunchyroll', label: 'CRUNCHYROLL' },
];

export const StreamingPlatformFeed: React.FC<StreamingPlatformFeedProps> = memo(({
  region = 'IN',
  onItemPress,
  showSwitcherHeader = true,
}) => {
  const [rows, setRows] = useState<StreamingPlatformRow[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | StreamingPlatformId>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const fetched = await streamingPlatformService.fetchPlatformRows({ region });
      setRows(fetched);
    } catch (err) {
      console.warn('Failed to load streaming platform rows:', err);
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTitlePress = useCallback((item: MediaItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onItemPress) {
      onItemPress(item);
    } else {
      router.push({
        pathname: '/title/[id]',
        params: { id: item.id },
      });
    }
  }, [onItemPress]);

  const handleFilterChange = (id: 'all' | StreamingPlatformId) => {
    Haptics.selectionAsync();
    setSelectedFilter(id);
  };

  const filteredRows = selectedFilter === 'all'
    ? rows
    : rows.filter((r) => r.id === selectedFilter);

  // Solid theme-matched skeleton placeholders
  if (loading && rows.length === 0) {
    return (
      <View style={styles.skeletonContainer}>
        {/* Switcher Skeleton */}
        <View style={styles.skeletonSwitcherRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonPill} />
          ))}
        </View>

        {/* Row Skeletons */}
        {[1, 2].map((rowIdx) => (
          <View key={rowIdx} style={styles.skeletonRow}>
            <View style={styles.skeletonRowHeader} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skeletonCardsRow}>
              {[1, 2, 3].map((cardIdx) => (
                <View key={cardIdx} style={styles.skeletonCard} />
              ))}
            </ScrollView>
          </View>
        ))}
      </View>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Compact Platform Switcher Pill Bar */}
      {showSwitcherHeader && (
        <View style={styles.switcherSection}>
          <View style={styles.switcherHeader}>
            <View style={styles.accentDot} />
            <Text
              style={styles.switcherLabel}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.2}
            >
              STREAMING SUBSCRIPTIONS
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherPillBar}
          >
            {PLATFORM_SWITCHER_OPTIONS.map((opt) => {
              const isActive = selectedFilter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.pillButton,
                    isActive && styles.pillButtonActive,
                  ]}
                  onPress={() => handleFilterChange(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pillButtonText,
                      isActive && styles.pillButtonTextActive,
                    ]}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.2}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Curated Platform Rows */}
      {filteredRows.map((row) => {
        if (!row.items || row.items.length === 0) return null;

        return (
          <View key={row.id} style={styles.rowSection}>
            <View style={styles.rowHeader}>
              <View style={styles.rowTitleGroup}>
                <Text
                  style={styles.rowTitle}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.25}
                >
                  {row.rowTitle}
                </Text>
                <View style={styles.badgePill}>
                  <Text
                    style={styles.badgeText}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.2}
                  >
                    {row.badge}
                  </Text>
                </View>
              </View>
              <Text
                style={styles.regionTag}
                allowFontScaling={true}
                maxFontSizeMultiplier={1.2}
              >
                {region}
              </Text>
            </View>

            <FlatList
              data={row.items}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowScroll}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={3}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item }) => (
                <PosterCard
                  item={item}
                  onPress={() => handleTitlePress(item)}
                />
              )}
            />
          </View>
        );
      })}
    </View>
  );
});

StreamingPlatformFeed.displayName = 'StreamingPlatformFeed';

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  switcherSection: {
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accentDot: {
    width: 5,
    height: 5,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  switcherLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  switcherPillBar: {
    gap: 8,
    paddingRight: 16,
  },
  pillButton: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accent,
  },
  pillButtonText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  pillButtonTextActive: {
    color: colors.textPrimary,
  },
  rowSection: {
    marginBottom: 24,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    letterSpacing: 0.8,
    color: colors.textPrimary,
  },
  badgePill: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    letterSpacing: 0.6,
    color: colors.accent,
  },
  regionTag: {
    fontFamily: typography.fontMedium,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  rowScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  skeletonSwitcherRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  skeletonPill: {
    width: 80,
    height: 28,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonRow: {
    marginBottom: 24,
  },
  skeletonRowHeader: {
    width: 140,
    height: 14,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 12,
  },
  skeletonCardsRow: {
    gap: 12,
  },
  skeletonCard: {
    width: 110,
    height: 160,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
