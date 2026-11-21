import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTracking } from '../../context/TrackingContext';
import { PosterCard } from '../../components/PosterCard';
import { MediaItem } from '../../services/types';

const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = 32; // 16px left + 16px right
const GRID_GAP = 10;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { watchlists, deleteWatchlist, toggleTitleInWatchlist, resolveMediaItem } = useTracking();
  const { width: windowWidth } = useWindowDimensions();

  // Dynamic 3-column width calculated to fill viewport edge-to-edge
  const cardWidth = useMemo(
    () => Math.floor((windowWidth - HORIZONTAL_PADDING - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS),
    [windowWidth]
  );

  const list = watchlists.find((l) => l.id === id);

  if (!list) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={17} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>WATCHLIST</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>WATCHLIST NOT FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  const items = list.titleIds
    .map((tid) => resolveMediaItem(tid))
    .filter((m): m is MediaItem => Boolean(m));

  const handleDelete = () => {
    Alert.alert('DELETE LIST', `Are you sure you want to delete "${list.name}"?`, [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'DELETE',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await deleteWatchlist(list.id);
          router.back();
        },
      },
    ]);
  };

  const handleRemoveTitle = (titleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTitleInWatchlist(list.id, titleId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={17} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {list.name.toUpperCase()}
        </Text>

        {list.isCustom ? (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.accent} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      {/* 2. FlatList Grid with Symmetrical Paddings */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.metaSection}>
            <View style={styles.metaHeaderRow}>
              <View style={styles.countBadge}>
                <View
                  style={[
                    styles.accentDot,
                    { backgroundColor: list.accentColor || colors.accent },
                  ]}
                />
                <Text style={styles.countText}>
                  {items.length} {items.length === 1 ? 'TITLE' : 'TITLES'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addTitlesBtn}
                activeOpacity={0.75}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Ionicons name="add" size={12} color={colors.textPrimary} style={{ marginRight: 2 }} />
                <Text style={styles.addTitlesText}>DISCOVER</Text>
              </TouchableOpacity>
            </View>

            {list.description ? (
              <Text style={styles.description}>{list.description}</Text>
            ) : null}

            <View style={styles.sectionDivider} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemWrapper, { width: cardWidth }]}>
            <PosterCard item={item} width={cardWidth} showProgress={false} />
            <TouchableOpacity
              onPress={() => handleRemoveTitle(item.id)}
              style={styles.removeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
              <Text style={styles.removeText}>REMOVE</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={34} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>NO TITLES IN THIS LIST</Text>
            <Text style={styles.emptySubtitle}>
              Browse titles in Explore and add them to build your personal watchlist.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.exploreBtnText}>EXPLORE TITLES →</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.void,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontBlack,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0.2,
    includeFontPadding: false,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  metaSection: {
    marginBottom: 14,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  accentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 6,
  },
  countText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  addTitlesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 2,
  },
  addTitlesText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  description: {
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 12,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: 14,
  },
  itemWrapper: {
    alignItems: 'center',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 6,
    paddingVertical: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  removeText: {
    fontFamily: typography.fontBold,
    color: colors.textMuted,
    fontSize: 8.5,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: 1,
    includeFontPadding: false,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: 16,
  },
  exploreBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 2,
  },
  exploreBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
    includeFontPadding: false,
  },
});
