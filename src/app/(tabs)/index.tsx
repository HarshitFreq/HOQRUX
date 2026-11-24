import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from '../../utils/haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTracking } from '../../context/TrackingContext';
import { MediaItem } from '../../services/types';
import { HomeDiscovery } from '../../components/HomeDiscovery';
import { CategoryTabs, HomeCategory } from '../../components/CategoryTabs';
import { ContinueWatchingShelf } from '../../components/ContinueWatchingShelf';
import { airingCalendarService, AiringEpisode } from '../../services/airingCalendarService';

function isAnimeMedia(m?: MediaItem | null): boolean {
  if (!m) return false;
  if (m.type === 'anime') return true;
  if (
    m.id?.startsWith('anilist-') ||
    m.id?.startsWith('kitsu-') ||
    m.id?.startsWith('mal-') ||
    m.id?.startsWith('jikan-')
  ) {
    return true;
  }
  if (m.genres && m.genres.some((g) => /anim|manga/i.test(g))) {
    return true;
  }
  if (
    m.originalLanguage === 'ja' ||
    (m as any).originCountry?.includes('JP') ||
    (m as any).origin_country?.includes('JP')
  ) {
    return true;
  }
  if (
    /ghoul|naruto|titan|slayer|jujutsu|piece|bleach|hero academia|chainsaw|death note|haikyuu|hunter|evangelion|cowboy bebop|fullmetal|dragon ball|one punch|sword art|frieren|dandadan|solo leveling|marnie|ghibli|miyazaki|totoro/i.test(
      m.title
    )
  ) {
    return true;
  }
  return false;
}

export default function NowScreen() {
  const {
    tracking,
    resolveMediaItem,
    refreshTracking,
    getShowProgress,
    watchlists,
  } = useTracking();
  const [selectedCategory, setSelectedCategory] = useState<HomeCategory>('all');
  const [radarEpisodes, setRadarEpisodes] = useState<AiringEpisode[]>([]);

  const trackedTvIds = useMemo(() => {
    return Object.keys(tracking || {}).filter((id) => !id.startsWith('movie-'));
  }, [tracking]);

  const loadRadarEpisodes = useCallback(async () => {
    try {
      const data = await airingCalendarService.getReleaseRadar(trackedTvIds);
      if (data.myRadar.length > 0) {
        setRadarEpisodes(data.myRadar.slice(0, 3));
      } else if (data.thisWeek.length > 0) {
        setRadarEpisodes(data.thisWeek.slice(0, 3));
      } else {
        setRadarEpisodes(data.today.slice(0, 3));
      }
    } catch {
      // Ignore
    }
  }, [trackedTvIds]);

  // Trigger live refresh whenever the NOW tab is focused
  useFocusEffect(
    useCallback(() => {
      refreshTracking();
      loadRadarEpisodes();
    }, [refreshTracking, loadRadarEpisodes])
  );

  // Active and ongoing logged items (only ongoing series & want-to-watch movies; NO completed items)
  const activeAndLoggedItems = useMemo(() => {
    const titleActivityTimes = new Map<string, number>();

    // 1. Gather all active / ongoing tracking records (STRICTLY exclude completed)
    Object.values(tracking).forEach((tr) => {
      if (tr.status === 'completed') return;

      const item = resolveMediaItem(tr.titleId);
      if (!item) return;

      const isMovie = item.type === 'movie';

      if (isMovie) {
        // Movies: Show Want to watch (plan_to_watch or watching)
        if (tr.status === 'plan_to_watch' || tr.status === 'watching') {
          const time = tr.updatedAt ? new Date(tr.updatedAt).getTime() : 0;
          titleActivityTimes.set(item.id, Math.max(titleActivityTimes.get(item.id) || 0, time));
        }
      } else {
        // Series: Only show ongoing series that have active log or watching status and are NOT 100% completed
        const progress = getShowProgress(item);
        const isSeriesDone =
          progress.percentage === 100 ||
          (progress.totalCount > 0 && progress.watchedCount >= progress.totalCount);
        if (isSeriesDone) return;

        const hasWatchedEpisodes = Object.values(tr.watchedEpisodes || {}).some((e) => e.watched);
        if (tr.status === 'watching' || tr.status === 'plan_to_watch' || hasWatchedEpisodes) {
          const time = tr.updatedAt ? new Date(tr.updatedAt).getTime() : 0;
          titleActivityTimes.set(item.id, Math.max(titleActivityTimes.get(item.id) || 0, time));
        }
      }
    });

    // 2. Also check watchlists for "Watching" and "Want to Watch" titles (movies, series, anime)
    watchlists.forEach((wl) => {
      if (wl.id === 'list-completed') return;
      (wl.titleIds || []).forEach((tId) => {
        const item = resolveMediaItem(tId);
        if (item) {
          const tr = tracking[item.id] || tracking[tId] || tracking[tId.replace(/^(tv|movie|anime)-/, '')];
          if (tr?.status !== 'completed') {
            const time = tr?.updatedAt ? new Date(tr.updatedAt).getTime() : 1;
            titleActivityTimes.set(item.id, Math.max(titleActivityTimes.get(item.id) || 0, time));
          }
        }
      });
    });

    // 3. Sort title IDs by most recent activity timestamp descending
    const sortedTitleIds = Array.from(titleActivityTimes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    // 4. Resolve MediaItem for each, strictly verifying uncompleted state
    const resolved = sortedTitleIds
      .map((id) => resolveMediaItem(id))
      .filter((item): item is MediaItem => {
        if (!item) return false;
        const tr = tracking[item.id] || tracking[item.id.replace(/^(tv|movie|anime)-/, '')];
        if (tr?.status === 'completed') return false;
        if (item.type !== 'movie') {
          const progress = getShowProgress(item);
          if (progress.percentage === 100) return false;
        }
        return true;
      });

    return resolved;
  }, [tracking, watchlists, resolveMediaItem, getShowProgress]);

  // Filtered watching cards according to the active category segment tab
  const displayWatching = useMemo(() => {
    if (selectedCategory === 'movies') {
      return activeAndLoggedItems.filter((m) => m.type === 'movie' && !isAnimeMedia(m));
    }
    if (selectedCategory === 'tv') {
      return activeAndLoggedItems.filter((m) => m.type === 'tv' && !isAnimeMedia(m));
    }
    if (selectedCategory === 'anime') {
      return activeAndLoggedItems.filter((m) => isAnimeMedia(m));
    }
    return activeAndLoggedItems;
  }, [activeAndLoggedItems, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Sticky Top Bar & Solid Pill Category Tabs (All, Cinema, Series, Anime) */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Continue Watching */}
        {displayWatching.length > 0 ? (
          <ContinueWatchingShelf items={displayWatching} />
        ) : (
          <View style={styles.emptySpotlightCard}>
            <Text style={styles.emptySpotlightTitle}>NO ACTIVE TITLES</Text>
            <Text style={styles.emptySpotlightDesc}>
              Films and shows you are currently watching will appear here with one-tap episode logging.
            </Text>
            <TouchableOpacity
              style={styles.emptySpotlightAction}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.emptySpotlightActionText}>DISCOVER TITLES →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. Release Radar // Airing Calendar Header */}
        <View style={styles.radarHeaderRow}>
          <View style={styles.radarHeaderLeft}>
            <View style={styles.radarLivePulse} />
            <Text style={styles.radarSectionTitle}>RELEASE RADAR</Text>
          </View>
          <TouchableOpacity
            style={styles.radarScheduleBtn}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/radar');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.radarScheduleBtnText}>AIRING CALENDAR →</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Upcoming Episodes from Radar */}
        {radarEpisodes.length > 0 ? (
          radarEpisodes.map((ep) => {
            const airDate = new Date(ep.airDate + 'T00:00:00');
            const day = airDate.getDate();
            const month = airDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            return (
              <TouchableOpacity
                key={ep.id}
                style={styles.scheduleItem}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: '/title/[id]', params: { id: ep.showId } });
                }}
              >
                <View style={styles.scheduleDateCol}>
                  <Text style={styles.scheduleDay}>{day}</Text>
                  <Text style={styles.scheduleMonth}>{month}</Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle} numberOfLines={1}>
                    {ep.showTitle}
                  </Text>
                  <Text style={styles.scheduleSub} numberOfLines={1}>
                    {ep.network ? `${ep.network} • ` : ''}S
                    {ep.seasonNumber < 10 ? `0${ep.seasonNumber}` : ep.seasonNumber}:E
                    {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                    {ep.episodeTitle ? ` "${ep.episodeTitle}"` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radarCountdownPill,
                    {
                      borderColor: ep.badgeColor,
                      backgroundColor:
                        ep.daysUntil === 0
                          ? 'rgba(229, 9, 20, 0.15)'
                          : ep.daysUntil === 1
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(59, 130, 246, 0.15)',
                    },
                  ]}
                >
                  <Text style={[styles.radarCountdownText, { color: ep.badgeColor }]}>
                    {ep.countdownLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <TouchableOpacity
            style={styles.radarBannerBox}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/radar');
            }}
          >
            <View style={styles.radarBannerLeft}>
              <Text style={styles.radarBannerTitle}>BROADCAST RADAR // UPCOMING TV</Text>
              <Text style={styles.radarBannerSub}>
                Track weekly TV broadcasts, series premieres & episode release dates.
              </Text>
            </View>
            <View style={styles.radarBannerBtn}>
              <Text style={styles.radarBannerBtnText}>EXPLORE →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 5. Streaming & Discovery Feed */}
        <View style={styles.discoveryHeader}>
          <View style={styles.radarGroup}>
            <View style={styles.radarDot} />
            <Text
              style={styles.radarTitle}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.25}
            >
              DISCOVERY
            </Text>
          </View>
        </View>

        <HomeDiscovery
          region="IN"
          category={selectedCategory}
          onItemPress={(item) =>
            router.push({ pathname: '/title/[id]', params: { id: item.id } })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 150,
    paddingTop: 12,
  },
  emptySpotlightCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  emptySpotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  emptySpotlightBadge: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  emptySpotlightTitle: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    marginBottom: 4,
    includeFontPadding: false,
  },
  emptySpotlightDesc: {
    fontFamily: typography.fontBody,
    fontSize: 10.5,
    color: colors.textMuted,
    lineHeight: 15,
    marginBottom: 14,
  },
  emptySpotlightAction: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.void,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  emptySpotlightActionText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  discoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  radarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  radarTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  statVal: {
    fontFamily: typography.fontBlack,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  statLbl: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    marginTop: 2,
    includeFontPadding: false,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 3,
  },
  scheduleDateCol: {
    alignItems: 'center',
    width: 36,
  },
  scheduleDay: {
    fontFamily: typography.fontBlack,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scheduleMonth: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  scheduleDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontFamily: typography.fontBold,
    fontSize: 11.5,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  scheduleSub: {
    fontFamily: typography.fontBody,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  radarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  radarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radarLivePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  radarSectionTitle: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  radarScheduleBtn: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.35)',
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
    borderRadius: 2,
  },
  radarScheduleBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.accent,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  radarCountdownPill: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 2,
    borderWidth: 1,
    marginLeft: 8,
  },
  radarCountdownText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  radarBannerBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 2,
  },
  radarBannerLeft: {
    flex: 1,
    marginRight: 10,
  },
  radarBannerTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  radarBannerSub: {
    fontFamily: typography.fontBody,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  radarBannerBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderRadius: 2,
  },
  radarBannerBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.accent,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
});
