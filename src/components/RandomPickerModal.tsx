import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { router } from 'expo-router';

import { MediaItem } from '../services/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { INITIAL_MEDIA_ITEMS } from '../services/mockData';
import { useTracking } from '../context/TrackingContext';

type RandomScope = 'explore' | 'watchlist';
type RandomFormat = 'all' | 'movie' | 'tv' | 'anime';

interface RandomPickerModalProps {
  visible: boolean;
  onClose: () => void;
  exploreItems?: MediaItem[];
}

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  visible,
  onClose,
  exploreItems = [],
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const { watchlists, resolveMediaItem, cacheMediaItem } = useTracking();

  const [scope, setScope] = useState<RandomScope>('explore');
  const [format, setFormat] = useState<RandomFormat>('all');
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  // 1. Resolve Watchlist Titles (Want to Watch)
  const watchlistTitles = useMemo(() => {
    const wantList = watchlists.find((l) => l.id === 'list-watchlist');
    // Also include other non-completed watchlists if wantList is empty
    const ids = wantList && wantList.titleIds.length > 0
      ? wantList.titleIds
      : watchlists
          .filter((l) => l.id !== 'list-completed')
          .flatMap((l) => l.titleIds);

    const dedupedIds = Array.from(new Set(ids));
    return dedupedIds
      .map((id) => resolveMediaItem(id))
      .filter((item): item is MediaItem => Boolean(item));
  }, [watchlists, resolveMediaItem]);

  // 2. Resolve Global Explore Pool (Initial Curated + Loaded Explore)
  const globalPool = useMemo(() => {
    const map = new Map<string, MediaItem>();
    INITIAL_MEDIA_ITEMS.forEach((it) => map.set(it.id, it));
    exploreItems.forEach((it) => map.set(it.id, it));
    return Array.from(map.values());
  }, [exploreItems]);

  // 3. Filter candidates by current Scope and Format
  const candidatePool = useMemo(() => {
    const base = scope === 'watchlist' ? watchlistTitles : globalPool;
    if (format === 'all') return base;
    if (format === 'anime') {
      return base.filter(
        (it) =>
          it.type === 'anime' ||
          it.genres?.some((g) => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))
      );
    }
    return base.filter((it) => it.type === format);
  }, [scope, format, watchlistTitles, globalPool]);

  // 4. Random Selection function
  const pickRandomTitle = useCallback(
    (pool: MediaItem[], excludeId?: string): MediaItem | null => {
      if (pool.length === 0) return null;
      if (pool.length === 1) return pool[0];
      const eligible = excludeId ? pool.filter((it) => it.id !== excludeId) : pool;
      const pickList = eligible.length > 0 ? eligible : pool;
      const randomIndex = Math.floor(Math.random() * pickList.length);
      return pickList[randomIndex];
    },
    []
  );

  // 5. Trigger a Roll with tactile haptic feedback
  const handleRoll = useCallback(
    (overrideScope?: RandomScope, overrideFormat?: RandomFormat) => {
      let targetPool = candidatePool;
      if (overrideScope !== undefined || overrideFormat !== undefined) {
        const activeScope = overrideScope ?? scope;
        const activeFormat = overrideFormat ?? format;
        const base = activeScope === 'watchlist' ? watchlistTitles : globalPool;
        if (activeFormat === 'all') {
          targetPool = base;
        } else if (activeFormat === 'anime') {
          targetPool = base.filter(
            (it) =>
              it.type === 'anime' ||
              it.genres?.some((g) => g.toLowerCase().includes('anime') || g.toLowerCase().includes('animation'))
          );
        } else {
          targetPool = base.filter((it) => it.type === activeFormat);
        }
      }

      if (targetPool.length === 0) {
        setCurrentItem(null);
        return;
      }

      setIsRolling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const picked = pickRandomTitle(targetPool, currentItem?.id);
      setTimeout(() => {
        setCurrentItem(picked);
        setIsRolling(false);
      }, 260);
    },
    [candidatePool, scope, format, watchlistTitles, globalPool, currentItem?.id, pickRandomTitle]
  );

  // Navigate to Title
  const handleViewTitle = async () => {
    if (!currentItem) return;
    Haptics.selectionAsync();
    await cacheMediaItem(currentItem);
    onClose();
    router.push(`/title/${currentItem.id}` as any);
  };

  const modalWidth = Math.min(windowWidth - 32, 400);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={() => handleRoll()}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { width: modalWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.statusRow}>
                <View style={styles.accentDot} />
                <Text style={styles.headerIndex}>PROTOCOL // RANDOM DISCOVERY</Text>
              </View>
              <Text style={styles.headerTitle}>SURPRISE ME</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Scope Selector: All Discovery vs My Watchlist */}
          <View style={styles.scopeBar}>
            <TouchableOpacity
              style={[styles.scopeBtn, scope === 'explore' && styles.scopeBtnActive]}
              activeOpacity={0.75}
              onPress={() => {
                Haptics.selectionAsync();
                setScope('explore');
                handleRoll('explore', format);
              }}
            >
              <Ionicons
                name="compass-outline"
                size={12}
                color={scope === 'explore' ? colors.accent : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.scopeBtnText, scope === 'explore' && styles.scopeBtnTextActive]}>
                ALL CATALOGUE
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scopeBtn,
                scope === 'watchlist' && styles.scopeBtnActive,
                watchlistTitles.length === 0 && { opacity: 0.45 },
              ]}
              activeOpacity={0.75}
              onPress={() => {
                if (watchlistTitles.length === 0) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  return;
                }
                Haptics.selectionAsync();
                setScope('watchlist');
                handleRoll('watchlist', format);
              }}
            >
              <Ionicons
                name="bookmark-outline"
                size={12}
                color={scope === 'watchlist' ? colors.accent : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.scopeBtnText, scope === 'watchlist' && styles.scopeBtnTextActive]}>
                WATCHLIST ({watchlistTitles.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Format Rail: ALL / FILMS / SERIES / ANIME */}
          <View style={styles.formatRail}>
            {(
              [
                { id: 'all', label: 'ANY' },
                { id: 'movie', label: 'FILMS' },
                { id: 'tv', label: 'SERIES' },
                { id: 'anime', label: 'ANIME' },
              ] as const
            ).map((fmt) => {
              const isActive = format === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  style={[styles.formatChip, isActive && styles.formatChipActive]}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFormat(fmt.id);
                    handleRoll(scope, fmt.id);
                  }}
                >
                  <Text
                    style={[styles.formatChipText, isActive && styles.formatChipTextActive]}
                  >
                    {fmt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Recommendation Presentation Card */}
          {isRolling ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.rollingText}>SHUFFLING THE ARCHIVE...</Text>
            </View>
          ) : currentItem ? (
            <View style={styles.recommendationBox}>
              {/* Backdrop / Poster Media Container with Gradient */}
              <View style={styles.mediaContainer}>
                <Image
                  source={{ uri: currentItem.backdropPath || currentItem.posterPath }}
                  style={styles.mediaImage}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={['rgba(5, 5, 7, 0.1)', 'rgba(5, 5, 7, 0.75)', '#0C0C0F']}
                  style={StyleSheet.absoluteFill}
                />

                {/* Top Badges */}
                <View style={styles.badgeRow}>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color={colors.starYellow} style={{ marginRight: 3 }} />
                    <Text style={styles.ratingText}>
                      {(currentItem.imdbRating || currentItem.tmdbRating || 7.5).toFixed(1)}
                    </Text>
                  </View>

                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>
                      {currentItem.type === 'movie'
                        ? 'FILM'
                        : currentItem.type === 'tv'
                        ? 'SERIES'
                        : currentItem.type.toUpperCase()}{' '}
                      · {currentItem.releaseYear}
                    </Text>
                  </View>
                </View>

                {/* Title & Micro-Meta nested inside bottom gradient */}
                <View style={styles.titleBlock}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {currentItem.title}
                  </Text>

                  <View style={styles.genreChipsRow}>
                    {currentItem.genres?.slice(0, 3).map((g, idx) => (
                      <View key={`${g}-${idx}`} style={styles.genreChip}>
                        <Text style={styles.genreChipText}>{g.toUpperCase()}</Text>
                      </View>
                    ))}
                    {currentItem.runtime ? (
                      <Text style={styles.runtimeText}>{currentItem.runtime} MIN</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Synopsis Preview */}
              <View style={styles.overviewContainer}>
                <Text style={styles.overviewText} numberOfLines={3}>
                  {currentItem.overview || 'No synopsis available for this title.'}
                </Text>
              </View>

              {/* Streaming Platform Pill (if available) */}
              {currentItem.providers && currentItem.providers.length > 0 && (
                <View style={styles.providerRow}>
                  <Ionicons name="play-circle-outline" size={13} color={colors.accent} style={{ marginRight: 5 }} />
                  <Text style={styles.providerText}>
                    Stream on {currentItem.providers[0].name}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={30} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>NO CANDIDATES MATCH</Text>
              <Text style={styles.emptySubtitle}>
                {scope === 'watchlist'
                  ? 'Your watchlist has no titles matching this format filter. Switch to All Catalogue or explore more titles.'
                  : 'No titles found in this format. Try choosing "ANY".'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.rollAgainBtn}
              activeOpacity={0.75}
              onPress={() => handleRoll()}
            >
              <Ionicons name="shuffle" size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.rollAgainText}>ROLL AGAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewTitleBtn,
                !currentItem && { opacity: 0.4 },
              ]}
              activeOpacity={0.8}
              onPress={handleViewTitle}
              disabled={!currentItem}
            >
              <Text style={styles.viewTitleText}>VIEW DETAILS →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  accentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  headerIndex: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  headerTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 16,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0.5,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  closeBtn: {
    padding: 4,
  },

  // Scope Selector
  scopeBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  scopeBtnActive: {
    backgroundColor: 'rgba(255, 42, 42, 0.12)',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  scopeBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  scopeBtnTextActive: {
    color: colors.textPrimary,
  },

  // Format Rail
  formatRail: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  formatChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5.5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  formatChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 42, 42, 0.12)',
  },
  formatChipText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  formatChipTextActive: {
    color: colors.accent,
  },

  // Recommendation Presentation Box
  recommendationBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#07070A',
    marginBottom: 16,
  },
  mediaContainer: {
    height: 180,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
  },
  mediaImage: {
    ...StyleSheet.absoluteFill,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  ratingText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.starYellow,
    includeFontPadding: false,
  },
  metaBadge: {
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  metaBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  titleBlock: {
    marginTop: 'auto',
  },
  itemTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
    marginBottom: 6,
  },
  genreChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  genreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  genreChipText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  runtimeText: {
    fontFamily: typography.fontMedium,
    fontSize: 9,
    color: colors.textMuted,
    marginLeft: 4,
  },
  overviewContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  overviewText: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16.5,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  providerText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },

  // Loading & Empty States
  loadingContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07070A',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  rollingText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 10,
    includeFontPadding: false,
  },
  emptyContainer: {
    paddingVertical: 45,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07070A',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: typography.fontBold,
    fontSize: 11.5,
    letterSpacing: 1,
    color: colors.textPrimary,
    marginBottom: 6,
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rollAgainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
  },
  rollAgainText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  viewTitleBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  viewTitleText: {
    fontFamily: typography.fontBlack,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#050507',
    includeFontPadding: false,
  },
});
