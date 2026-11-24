import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../utils/feedback';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTracking } from '../context/TrackingContext';
import {
  airingCalendarService,
  AiringEpisode,
  ReleaseRadarData,
} from '../services/airingCalendarService';
import {
  scheduleReleaseAlert,
  cancelReleaseAlert,
  getScheduledAlerts,
  isAutoSyncQueueEnabled,
  setAutoSyncQueueEnabled,
  syncQueueRadarAlerts,
} from '../services/notificationService';

type RadarSegment = 'my' | 'week' | 'today' | 'upcoming';

export default function ReleaseRadarScreen() {
  const { tracking, resolveMediaItem, setWatchStatus, toggleReminder } = useTracking();
  const [activeSegment, setActiveSegment] = useState<RadarSegment>('my');
  const [radarData, setRadarData] = useState<ReleaseRadarData | null>(null);
  const [scheduledAlertIds, setScheduledAlertIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // Load scheduled notification alerts
  const loadAlerts = useCallback(async () => {
    try {
      const alerts = await getScheduledAlerts();
      setScheduledAlertIds(new Set(Object.keys(alerts)));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getScheduledAlerts()
      .then((alerts) => {
        if (isMounted) {
          setScheduledAlertIds(new Set(Object.keys(alerts)));
        }
      })
      .catch(() => {});
    isAutoSyncQueueEnabled()
      .then((enabled) => {
        if (isMounted) {
          setAutoSyncEnabled(enabled);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract all tracked show IDs
  const trackedShowIds = useMemo(() => {
    return Object.keys(tracking || {}).filter(
      (id) => !id.startsWith('movie-')
    );
  }, [tracking]);

  const runAutoSyncIfEnabled = useCallback(
    async (data: ReleaseRadarData | null) => {
      if (!data || !data.myRadar || data.myRadar.length === 0) return;
      const enabled = await isAutoSyncQueueEnabled();
      if (!enabled) return;

      const res = await syncQueueRadarAlerts(data.myRadar);
      if (res.newlyScheduled > 0) {
        await loadAlerts();
        setStatusBanner(`RADAR AUTO-SYNCED // ${res.newlyScheduled} NEW ALERTS ARMED`);
        setTimeout(() => setStatusBanner(null), 3500);
      }
    },
    [loadAlerts]
  );

  const loadRadar = useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) setIsRefreshing(true);
        const data = await airingCalendarService.getReleaseRadar(trackedShowIds, forceRefresh);
        setRadarData(data);
        runAutoSyncIfEnabled(data);
      } catch (e) {
        console.warn('Failed to load radar data:', e);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [trackedShowIds, runAutoSyncIfEnabled]
  );

  useEffect(() => {
    let isMounted = true;
    airingCalendarService
      .getReleaseRadar(trackedShowIds)
      .then((data) => {
        if (isMounted) {
          setRadarData(data);
          setIsLoading(false);
          runAutoSyncIfEnabled(data);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [trackedShowIds, runAutoSyncIfEnabled]);

  const handleToggleAutoSync = useCallback(async () => {
    feedback.toggle();
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    await setAutoSyncQueueEnabled(next);

    if (next) {
      if (radarData?.myRadar?.length) {
        const res = await syncQueueRadarAlerts(radarData.myRadar);
        await loadAlerts();
        setStatusBanner(
          res.newlyScheduled > 0
            ? `QUEUE RADAR ARMED // ${res.newlyScheduled} NEW BROADCASTS ARMED`
            : `QUEUE RADAR ARMED // ${res.totalActive} ACTIVE ALERTS`
        );
      } else {
        setStatusBanner('QUEUE RADAR AUTO-SYNC ARMED');
      }
      setTimeout(() => setStatusBanner(null), 3500);
    } else {
      setStatusBanner('QUEUE RADAR AUTO-SYNC MUTED');
      setTimeout(() => setStatusBanner(null), 3000);
    }
  }, [autoSyncEnabled, radarData, loadAlerts]);

  const handleRefresh = useCallback(() => {
    feedback.tap();
    loadRadar(true);
    loadAlerts();
  }, [loadRadar, loadAlerts]);

  const handleToggleAlert = useCallback(
    async (episode: AiringEpisode) => {
      const isScheduled = scheduledAlertIds.has(String(episode.showId));
      if (isScheduled) {
        feedback.toggle();
        await cancelReleaseAlert(episode.showId);
        setScheduledAlertIds((prev) => {
          const next = new Set(prev);
          next.delete(String(episode.showId));
          return next;
        });
        setStatusBanner(`ALERT CANCELLED // ${episode.showTitle.toUpperCase()}`);
        setTimeout(() => setStatusBanner(null), 3000);
      } else {
        feedback.success();
        const epInfo = `S${String(episode.seasonNumber).padStart(2, '0')}E${String(
          episode.episodeNumber
        ).padStart(2, '0')}: ${episode.episodeTitle || 'New Episode'}`;

        const notifId = await scheduleReleaseAlert({
          id: episode.showId,
          title: episode.showTitle,
          type: 'tv',
          releaseDate: episode.airDate,
          episodeInfo: epInfo,
        });

        if (notifId) {
          setScheduledAlertIds((prev) => new Set(prev).add(String(episode.showId)));
          setStatusBanner(`RADAR ALERT SYNCED // ${episode.showTitle.toUpperCase()}`);
          setTimeout(() => setStatusBanner(null), 3000);
        } else {
          Alert.alert(
            'PERMISSIONS REQUIRED',
            'Allow notifications to receive broadcast alerts when this episode airs.'
          );
        }
      }
    },
    [scheduledAlertIds]
  );

  const currentEpisodes: AiringEpisode[] = useMemo(() => {
    if (!radarData) return [];
    switch (activeSegment) {
      case 'my':
        return radarData.myRadar;
      case 'today':
        return radarData.today;
      case 'week':
        return radarData.thisWeek;
      case 'upcoming':
        return radarData.upcoming;
      default:
        return radarData.thisWeek;
    }
  }, [activeSegment, radarData]);

  const handleToggleTrack = useCallback(
    async (episode: AiringEpisode) => {
      const isCurrentlyTracked = Boolean(tracking[episode.showId]);
      if (isCurrentlyTracked) {
        feedback.toggle();
        await toggleReminder(episode.showId);
      } else {
        feedback.success();
        const item = resolveMediaItem(episode.showId) || {
          id: episode.showId,
          title: episode.showTitle,
          posterPath: episode.showPoster,
          backdropPath: episode.showBackdrop,
          type: 'tv' as const,
          releaseYear: new Date(episode.airDate || Date.now()).getFullYear(),
          overview: episode.overview || '',
          genres: ['Series'],
          tmdbRating: 8.0,
        };
        await setWatchStatus(item, 'plan_to_watch');
      }
    },
    [tracking, resolveMediaItem, setWatchStatus, toggleReminder]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            feedback.tap();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
          <Text style={styles.backBtnText}>BACK</Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.autoSyncBtn, autoSyncEnabled && styles.autoSyncBtnActive]}
            onPress={handleToggleAutoSync}
            activeOpacity={0.7}
          >
            <View style={[styles.autoSyncDot, autoSyncEnabled && styles.autoSyncDotActive]} />
            <Text style={[styles.autoSyncBtnText, autoSyncEnabled && styles.autoSyncBtnTextActive]}>
              AUTO-SYNC
            </Text>
          </TouchableOpacity>

          <View style={styles.liveIndicator}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveIndicatorText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Screen Title & Subtitle */}
      <View style={styles.titleBanner}>
        <Text style={styles.screenTitle}>RELEASE RADAR</Text>
        <Text style={styles.screenSubtitle}>
          UPCOMING TV EPISODES, AIR DATES & SERIES BROADCASTS
        </Text>
      </View>

      {/* Status Banner */}
      {statusBanner && (
        <View style={styles.statusBannerRow}>
          <Ionicons name="checkmark-circle-outline" size={13} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={styles.statusBannerText}>{statusBanner}</Text>
        </View>
      )}

      {/* Segment Selector */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'my' && styles.segmentBtnActive]}
          onPress={() => {
            feedback.toggle();
            setActiveSegment('my');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'my' && styles.segmentTextActive]}>
            MY QUEUE ({radarData?.myRadar.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'week' && styles.segmentBtnActive]}
          onPress={() => {
            feedback.toggle();
            setActiveSegment('week');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'week' && styles.segmentTextActive]}>
            THIS WEEK ({radarData?.thisWeek.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'today' && styles.segmentBtnActive]}
          onPress={() => {
            feedback.toggle();
            setActiveSegment('today');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'today' && styles.segmentTextActive]}>
            TODAY ({radarData?.today.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            { borderRightWidth: 0 },
            activeSegment === 'upcoming' && styles.segmentBtnActive,
          ]}
          onPress={() => {
            feedback.toggle();
            setActiveSegment('upcoming');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'upcoming' && styles.segmentTextActive]}>
            LATER ({radarData?.upcoming.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content List */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>SCANNING BROADCAST SCHEDULE...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {currentEpisodes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="radio-outline" size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>
                {activeSegment === 'my'
                  ? 'NO UPCOMING EPISODES IN YOUR QUEUE'
                  : 'NO BROADCASTS SCHEDULED FOR THIS PERIOD'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeSegment === 'my'
                  ? 'Shows you track or add to your watchlist will appear here with air date countdowns whenever new episodes are announced.'
                  : 'Check back soon for new season announcements and broadcast dates.'}
              </Text>

              {activeSegment === 'my' && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveSegment('week')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionBtnText}>{"EXPLORE THIS WEEK'S ON AIR →"}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            currentEpisodes.map((ep) => {
              const isTracked = Boolean(tracking[ep.showId]);
              const isAlertScheduled = scheduledAlertIds.has(String(ep.showId));
              return (
                <TouchableOpacity
                  key={ep.id}
                  style={styles.episodeCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    feedback.tap();
                    router.push({
                      pathname: '/title/[id]',
                      params: { id: ep.showId },
                    });
                  }}
                >
                  {/* Poster Thumbnail */}
                  <View style={styles.posterWrapper}>
                    <Image
                      source={{ uri: ep.showPoster }}
                      style={styles.poster}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  </View>

                  {/* Details Column */}
                  <View style={styles.cardInfo}>
                    {/* Top Meta Row */}
                    <View style={styles.cardMetaRow}>
                      <View style={styles.networkBadgeGroup}>
                        {ep.network ? (
                          <View style={styles.networkPill}>
                            <Text style={styles.networkPillText}>{ep.network.toUpperCase()}</Text>
                          </View>
                        ) : null}
                        <View style={styles.seriesTag}>
                          <Text style={styles.seriesTagText}>SERIES</Text>
                        </View>
                      </View>

                      {/* Countdown Badge */}
                      <View
                        style={[
                          styles.countdownBadge,
                          {
                            backgroundColor:
                              ep.daysUntil === 0
                                ? 'rgba(229, 9, 20, 0.15)'
                                : ep.daysUntil === 1
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(59, 130, 246, 0.15)',
                            borderColor: ep.badgeColor,
                          },
                        ]}
                      >
                        <View style={[styles.countdownDot, { backgroundColor: ep.badgeColor }]} />
                        <Text style={[styles.countdownText, { color: ep.badgeColor }]}>
                          {ep.countdownLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Show Title */}
                    <Text style={styles.showTitle} numberOfLines={1}>
                      {ep.showTitle}
                    </Text>

                    {/* Episode Designation */}
                    <Text style={styles.episodeDesignation} numberOfLines={1}>
                      S{ep.seasonNumber < 10 ? `0${ep.seasonNumber}` : ep.seasonNumber} • E
                      {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                      {ep.episodeTitle ? ` "${ep.episodeTitle}"` : ''}
                    </Text>

                    {/* Air Date & Quick Track Action */}
                    <View style={styles.cardBottomRow}>
                      <View style={styles.airDateRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.airDateText}>{ep.formattedDate}</Text>
                      </View>

                      <View style={styles.cardActionsGroup}>
                        <TouchableOpacity
                          style={[styles.bellBtn, isAlertScheduled && styles.bellBtnActive]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleAlert(ep);
                          }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={isAlertScheduled ? 'notifications' : 'notifications-outline'}
                            size={12}
                            color={isAlertScheduled ? colors.accent : colors.textMuted}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.trackBtn, isTracked && styles.trackBtnActive]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleTrack(ep);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isTracked ? 'checkmark' : 'add'}
                            size={11}
                            color={isTracked ? colors.accent : colors.textPrimary}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={[styles.trackBtnText, isTracked && styles.trackBtnTextActive]}>
                            {isTracked ? 'TRACKED' : 'QUEUE'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? ('max(env(safe-area-inset-top, 0px), 12px)' as any) : 8,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    gap: 4,
  },
  backBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    gap: 5,
  },
  autoSyncBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  autoSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  autoSyncDotActive: {
    backgroundColor: colors.accent,
  },
  autoSyncBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  autoSyncBtnTextActive: {
    color: colors.accent,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    borderRadius: 2,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  liveIndicatorText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.accent,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  titleBanner: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  screenSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    marginTop: 3,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  segmentText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: colors.accent,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 120,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
    includeFontPadding: false,
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 2,
  },
  emptyActionBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 12,
    marginBottom: 10,
  },
  posterWrapper: {
    marginRight: 12,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  networkBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  networkPill: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
  },
  networkPillText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  seriesTag: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.25)',
    borderRadius: 2,
  },
  seriesTagText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.accent,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 2,
    gap: 4,
  },
  countdownDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  countdownText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  showTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  episodeDesignation: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  airDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airDateText: {
    fontFamily: typography.fontMedium,
    fontSize: 9.5,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3.5,
    paddingHorizontal: 7,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
  },
  trackBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  trackBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  trackBtnTextActive: {
    color: colors.accent,
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 9, 20, 0.3)',
  },
  statusBannerText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bellBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
  },
});
