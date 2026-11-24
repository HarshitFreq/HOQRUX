import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from '../../utils/haptics';
import { feedback } from '../../utils/feedback';
import {
  isNotificationsEnabled,
  setNotificationsEnabled,
  isAutoSyncQueueEnabled,
  setAutoSyncQueueEnabled,
  syncQueueRadarAlerts,
} from '../../services/notificationService';
import { airingCalendarService } from '../../services/airingCalendarService';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTracking } from '../../context/TrackingContext';
import { useAuth } from '../../context/AuthContext';
import { AccountModal } from '../../components/AccountModal';
import { LegalAboutModal } from '../../components/LegalAboutModal';

export default function ActivityScreen() {
  const { user, isAuthenticated, signOut, deleteAccount } = useAuth();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const {
    tracking,
    watchlists,
    history,
    stats,
    clearHistory,
    clearAllActivity,
    removeHistoryItem,
    resolveMediaItem,
    refreshTracking,
  } = useTracking();
  const [activeSegment, setActiveSegment] = useState<'history' | 'stats' | 'settings'>('history');
  const [notificationsActive, setNotificationsActive] = useState(true);
  const [autoSyncActive, setAutoSyncActive] = useState(true);
  const [hapticsActive, setHapticsActive] = useState(feedback.isHapticsEnabled());

  useFocusEffect(
    useCallback(() => {
      refreshTracking();
      isNotificationsEnabled().then(setNotificationsActive);
      isAutoSyncQueueEnabled().then(setAutoSyncActive);
      setHapticsActive(feedback.isHapticsEnabled());
    }, [refreshTracking])
  );

  const handleToggleNotifications = async () => {
    const next = !notificationsActive;
    setNotificationsActive(next);
    await setNotificationsEnabled(next);
    feedback.toggle();
  };

  const handleToggleAutoSync = async () => {
    const next = !autoSyncActive;
    setAutoSyncActive(next);
    await setAutoSyncQueueEnabled(next);
    feedback.toggle();

    if (next) {
      const trackedTvIds = Object.keys(tracking || {}).filter((id) => !id.startsWith('movie-'));
      airingCalendarService.getReleaseRadar(trackedTvIds).then((radar) => {
        if (radar?.myRadar?.length) {
          syncQueueRadarAlerts(radar.myRadar);
        }
      }).catch(() => {});
    }
  };

  const handleToggleHaptics = async () => {
    const next = !hapticsActive;
    setHapticsActive(next);
    await feedback.setHapticsEnabled(next);
    feedback.toggle();
  };

  const handleSignOut = () => {
    Alert.alert(
      'SIGN OUT',
      'Your watchlists and viewing history remain safely in your account. You can sign back in anytime to restore them.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'SIGN OUT',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await signOut();
            await refreshTracking();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'DELETE ACCOUNT & PURGE DATA',
      'This action permanently erases your account, custom watchlists, ratings, and viewing history from both your device and cloud servers. This cannot be undone.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'PERMANENTLY DELETE',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const res = await deleteAccount();
            if (res.success) {
              await refreshTracking();
              Alert.alert('ACCOUNT PURGED', 'Your account and tracking data have been permanently deleted.');
            } else {
              Alert.alert('ERROR', res.error || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'CLEAR VIEWING LOG',
      'Choose what to clear from your tracking data:',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'CLEAR LOG ONLY',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await clearHistory();
          },
        },
        {
          text: 'RESET ALL (QUEUE & LOGS)',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await clearAllActivity();
          },
        },
      ]
    );
  };

  const handleRemoveItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeHistoryItem(id);
  };

  const formatWatchedDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return 'RECENT';
    }
  };

  // Dynamic 14-day viewing cadence computed from real history timestamps
  const cadenceData = useMemo(() => {
    const days: { dateStr: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ dateStr: key, count: 0 });
    }

    const dayMap = new Map<string, number>();
    days.forEach((d) => dayMap.set(d.dateStr, 0));

    history.forEach((h) => {
      try {
        const key = new Date(h.watchedAt).toISOString().split('T')[0];
        if (dayMap.has(key)) {
          dayMap.set(key, (dayMap.get(key) || 0) + 1);
        }
      } catch {
        // Ignore
      }
    });

    const maxCount = Math.max(...Array.from(dayMap.values()), 1);
    return days.map((d, idx) => {
      const count = dayMap.get(d.dateStr) || 0;
      const isToday = idx === 13;
      return {
        dateStr: d.dateStr,
        count,
        heightRatio: count / maxCount,
        hasActivity: count > 0,
        isToday,
      };
    });
  }, [history]);

  // Proportional format distribution (Series vs Films vs Anime)
  const formatDistribution = useMemo(() => {
    let seriesCount = 0;
    let moviesCount = 0;
    let animeCount = 0;
    Object.values(tracking || {}).forEach((tr) => {
      const it = resolveMediaItem(tr.titleId);
      if (it?.type === 'tv') seriesCount++;
      else if (it?.type === 'movie') moviesCount++;
      else if (it?.type === 'anime') animeCount++;
      else seriesCount++;
    });
    const total = seriesCount + moviesCount + animeCount || 1;
    return {
      seriesPct: Math.round((seriesCount / total) * 100),
      moviesPct: Math.round((moviesCount / total) * 100),
      animePct: Math.round((animeCount / total) * 100),
      seriesCount,
      moviesCount,
      animeCount,
    };
  }, [tracking, resolveMediaItem]);

  const trackedCount = Object.keys(tracking || {}).length;
  const listCount = watchlists?.length || 0;
  const logCount = history?.length || 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Minimal Clean Profile Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={styles.headerRightActions}>
            {!isAuthenticated && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAccountModalOpen(true);
                }}
                style={styles.headerAccountBtn}
                activeOpacity={0.7}
              >
                <View style={[styles.headerStatusDot, { backgroundColor: colors.textMuted }]} />
                <Text style={styles.headerAccountBtnText}>SIGN IN</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsLegalModalOpen(true);
              }}
              style={styles.headerInfoBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="information-circle-outline" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Details Card - Pure Typography, No Logo */}
        <View style={styles.profileCard}>
          {isAuthenticated ? (
            <View style={styles.profileDetails}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.nameBlock}>
                  <Text style={styles.profileName}>{user.username || 'USER'}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.cardSignOutBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={12} color={colors.accent} style={{ marginRight: 3 }} />
                  <Text style={styles.cardSignOutText}>SIGN OUT</Text>
                </TouchableOpacity>
              </View>

              {/* Interactive Metrics Strip */}
              <View style={styles.metricsBar}>
                <TouchableOpacity
                  style={styles.metricItem}
                  onPress={() => router.push('/(tabs)')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.metricVal}>{trackedCount}</Text>
                  <Text style={styles.metricLbl}>TRACKED</Text>
                </TouchableOpacity>
                <View style={styles.metricDivider} />
                <TouchableOpacity
                  style={styles.metricItem}
                  onPress={() => router.push('/(tabs)/lists')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.metricVal}>{listCount}</Text>
                  <Text style={styles.metricLbl}>LISTS</Text>
                </TouchableOpacity>
                <View style={styles.metricDivider} />
                <TouchableOpacity
                  style={styles.metricItem}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveSegment('history');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.metricVal, activeSegment === 'history' && { color: colors.accent }]}>
                    {logCount}
                  </Text>
                  <Text style={styles.metricLbl}>LOGBOOK</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.guestDetails}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.nameBlock}>
                  <Text style={styles.profileName}>GUEST ACCOUNT</Text>
                  <Text style={styles.profileEmail}>Tracking saved locally on this device</Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDotGuest} />
                  <Text style={styles.statusBadgeText}>LOCAL</Text>
                </View>
              </View>

              {/* Interactive Metrics Strip */}
              <View style={styles.metricsBar}>
                <TouchableOpacity
                  style={styles.metricItem}
                  onPress={() => router.push('/(tabs)')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.metricVal}>{trackedCount}</Text>
                  <Text style={styles.metricLbl}>TRACKED</Text>
                </TouchableOpacity>
                <View style={styles.metricDivider} />
                <TouchableOpacity
                  style={styles.metricItem}
                  onPress={() => router.push('/(tabs)/lists')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.metricVal}>{listCount}</Text>
                  <Text style={styles.metricLbl}>LISTS</Text>
                </TouchableOpacity>
                <View style={styles.metricDivider} />
                <TouchableOpacity
                  style={styles.metricItem}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveSegment('history');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.metricVal, activeSegment === 'history' && { color: colors.accent }]}>
                    {logCount}
                  </Text>
                  <Text style={styles.metricLbl}>LOGBOOK</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.guestSignInBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsAccountModalOpen(true);
                }}
              >
                <Ionicons name="cloud-upload-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.guestSignInBtnText}>SIGN IN TO SYNC WITH CLOUD →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabular Segment Switcher */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
            onPress={() => {
              feedback.toggle();
              setActiveSegment('history');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'history' && styles.segmentTextActive]}>
              LOG ({history.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'stats' && styles.segmentBtnActive]}
            onPress={() => {
              feedback.toggle();
              setActiveSegment('stats');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'stats' && styles.segmentTextActive]}>
              STATS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              { borderRightWidth: 0 },
              activeSegment === 'settings' && styles.segmentBtnActive,
            ]}
            onPress={() => {
              feedback.toggle();
              setActiveSegment('settings');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'settings' && styles.segmentTextActive]}>
              SETTINGS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Segment 1: Viewing Log */}
        {activeSegment === 'history' && (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {history.length > 0 && (
              <View style={styles.logSubHeader}>
                <Text style={styles.logSubHeaderText}>ACTIVITY LOGBOOK</Text>
                <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
                  <Text style={styles.clearLogsLink}>CLEAR LOGS</Text>
                </TouchableOpacity>
              </View>
            )}

            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>NO VIEWING HISTORY YET</Text>
                <Text style={styles.emptySubtitle}>
                  Logged episodes and completed films will automatically appear here.
                </Text>
                <TouchableOpacity
                  style={styles.emptyExploreBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/search')}
                >
                  <Text style={styles.emptyExploreBtnText}>EXPLORE TITLES →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              history.map((entry) => {
                const itemRef = entry?.titleId ? resolveMediaItem(entry.titleId) : undefined;
                const posterUri = itemRef?.posterPath || entry?.posterPath || '';
                return (
                  <View key={entry.id} style={styles.historyCard}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({ pathname: '/title/[id]', params: { id: entry.titleId } })
                      }
                      style={styles.posterWrapper}
                    >
                      <Image
                        source={{ uri: posterUri }}
                        style={styles.historyPoster}
                        contentFit="cover"
                        transition={150}
                        cachePolicy="memory-disk"
                      />
                    </TouchableOpacity>

                    <View style={styles.historyInfo}>
                      <View style={styles.historyTopRow}>
                        <View style={styles.historyTagGroup}>
                          <Text style={styles.formatTag}>
                            {entry.mediaType === 'tv' ? 'SERIES' : 'FILM'}
                          </Text>
                          {tracking[entry.titleId]?.rating ? (
                            <View style={styles.userRatingPill}>
                              <Text style={styles.userRatingPillText}>
                                ★ {tracking[entry.titleId].rating?.toFixed(1)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.historyDate}>
                          {formatWatchedDate(entry.watchedAt)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          router.push({ pathname: '/title/[id]', params: { id: entry.titleId } })
                        }
                      >
                        <Text style={styles.historyTitle} numberOfLines={1}>
                          {entry.titleName}
                        </Text>
                        {entry.mediaType === 'tv' && entry.seasonNumber ? (
                          <Text style={styles.historyEpisode} numberOfLines={1}>
                            S{entry.seasonNumber} • E{entry.episodeNumber} {entry.episodeTitle ? `/ ${entry.episodeTitle}` : ''}
                          </Text>
                        ) : (
                          <Text style={styles.historyEpisode}>Feature Film Completed</Text>
                        )}
                      </TouchableOpacity>

                      <View style={styles.historyBottomRow}>
                        <View />
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(entry.id)}
                          style={styles.deleteIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Segment 2: Minimal Viewing Ledger & Habits */}
        {activeSegment === 'stats' && (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Monolithic Hero Time & Volume Ledger */}
            <View style={styles.minimalLedgerCard}>
              {/* Primary Lifetime Time */}
              <View style={styles.heroTimeContainer}>
                <Text style={styles.heroTimeOverline}>LIFETIME WATCH TIME</Text>
                <View style={styles.heroTimeRow}>
                  <Text style={styles.heroTimeValue}>{stats.totalHoursWatched}</Text>
                  <Text style={styles.heroTimeUnit}>HOURS</Text>
                </View>
              </View>

              <View style={styles.ledgerHairline} />

              {/* 3-Column Volume Breakdown (Zero Boxes, Pure Typographic Grid) */}
              <View style={styles.volumeGridRow}>
                <View style={styles.volumeCol}>
                  <Text style={styles.volumeNumber}>{stats.totalEpisodesWatched}</Text>
                  <Text style={styles.volumeLabel}>EPISODES</Text>
                </View>
                <View style={styles.volumeDivider} />
                <View style={styles.volumeCol}>
                  <Text style={styles.volumeNumber}>{stats.totalMoviesWatched}</Text>
                  <Text style={styles.volumeLabel}>FILMS</Text>
                </View>
                <View style={styles.volumeDivider} />
                <View style={styles.volumeCol}>
                  <Text style={styles.volumeNumber}>{trackedCount}</Text>
                  <Text style={styles.volumeLabel}>IN ARCHIVE</Text>
                </View>
              </View>
            </View>

            {/* 2. Format Distribution (Clean Segmented Ratio Bar) */}
            <View style={styles.minimalSectionCard}>
              <View style={styles.minimalSectionHeader}>
                <Text style={styles.minimalSectionTitle}>MEDIA SPLIT</Text>
                <Text style={styles.minimalSectionMeta}>
                  {formatDistribution.seriesPct}% SERIES · {formatDistribution.moviesPct}% FILMS
                  {formatDistribution.animePct > 0 ? ` · ${formatDistribution.animePct}% ANIME` : ''}
                </Text>
              </View>

              <View style={styles.ratioBarTrack}>
                <View
                  style={[
                    styles.ratioBarFill,
                    {
                      width: `${formatDistribution.seriesPct}%`,
                      backgroundColor: colors.textPrimary,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.ratioBarFill,
                    {
                      width: `${formatDistribution.moviesPct}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
                {formatDistribution.animePct > 0 && (
                  <View
                    style={[
                      styles.ratioBarFill,
                      {
                        width: `${formatDistribution.animePct}%`,
                        backgroundColor: colors.starYellow,
                      },
                    ]}
                  />
                )}
              </View>

              <View style={styles.ratioLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.textPrimary }]} />
                  <Text style={styles.legendText}>SERIES ({formatDistribution.seriesCount})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                  <Text style={styles.legendText}>FILMS ({formatDistribution.moviesCount})</Text>
                </View>
                {formatDistribution.animePct > 0 && (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.starYellow }]} />
                    <Text style={styles.legendText}>ANIME ({formatDistribution.animeCount})</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 3. Top Genres (Minimal Typographic Lines) */}
            {stats.topGenres.length > 0 && (
              <View style={styles.minimalSectionCard}>
                <View style={styles.minimalSectionHeader}>
                  <Text style={styles.minimalSectionTitle}>TOP GENRES</Text>
                  <Text style={styles.minimalSectionMeta}>PRIMARY TASTE</Text>
                </View>

                <View style={styles.genreListWrap}>
                  {stats.topGenres.map((g, idx) => (
                    <View key={g.genre} style={styles.genreItemRow}>
                      <View style={styles.genreHeaderRow}>
                        <Text style={styles.genreNameText}>{g.genre.toUpperCase()}</Text>
                        <Text style={styles.genrePctText}>{g.percentage}%</Text>
                      </View>
                      <View style={styles.genreBarTrack}>
                        <View
                          style={[
                            styles.genreBarFill,
                            {
                              width: `${g.percentage}%`,
                              backgroundColor:
                                idx === 0
                                  ? colors.accent
                                  : idx === 1
                                  ? colors.textPrimary
                                  : colors.borderLight,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 4. Viewing Cadence (14-Day Micro Activity) */}
            <View style={styles.minimalSectionCard}>
              <View style={styles.minimalSectionHeader}>
                <Text style={styles.minimalSectionTitle}>14-DAY CADENCE</Text>
                <Text style={styles.minimalStreakBadge}>{stats.streakDays}D STREAK</Text>
              </View>

              <View style={styles.cadenceChart}>
                {cadenceData.map((day) => (
                  <View
                    key={day.dateStr}
                    style={[
                      styles.cadenceBar,
                      {
                        height: Math.max(day.heightRatio * 28, 4),
                        backgroundColor: day.isToday
                          ? colors.accent
                          : day.hasActivity
                          ? colors.textPrimary
                          : '#191922',
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.cadenceLegendRow}>
                <Text style={styles.cadenceLegendText}>14D AGO</Text>
                <Text style={styles.cadenceLegendText}>
                  {history.length} {history.length === 1 ? 'SESSION' : 'SESSIONS'} LOGGED
                </Text>
                <Text style={styles.cadenceLegendText}>TODAY</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Segment 3: Settings & Preferences */}
        {activeSegment === 'settings' && (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.settingsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Release Radar Notifications Card */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeaderRow}>
                <View style={styles.settingsHeaderIconBox}>
                  <Ionicons name="notifications" size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.settingsCardTitle}>RELEASE RADAR NOTIFICATIONS</Text>
                  <Text style={styles.settingsCardDesc}>
                    Alerts on air dates for scheduled episodes and theatrical releases in your queue.
                  </Text>
                </View>
              </View>

              <View style={styles.settingActionRow}>
                <Text style={styles.settingStatusLabel}>NOTIFICATIONS</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, notificationsActive && styles.toggleBtnActive]}
                  onPress={handleToggleNotifications}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleDot, notificationsActive && styles.toggleDotActive]} />
                  <Text style={[styles.toggleText, notificationsActive && styles.toggleTextActive]}>
                    {notificationsActive ? 'ENABLED' : 'MUTED'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.settingActionRow, { marginTop: 10 }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.settingStatusLabel}>AUTO-SYNC QUEUE RADAR</Text>
                  <Text style={styles.settingSubDesc}>
                    Auto-schedules 9:00 AM alerts for all upcoming broadcasts in queue
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, autoSyncActive && styles.toggleBtnActive]}
                  onPress={handleToggleAutoSync}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleDot, autoSyncActive && styles.toggleDotActive]} />
                  <Text style={[styles.toggleText, autoSyncActive && styles.toggleTextActive]}>
                    {autoSyncActive ? 'ACTIVE' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tactile Haptics Card */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeaderRow}>
                <View style={styles.settingsHeaderIconBox}>
                  <Ionicons name="hardware-chip" size={16} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.settingsCardTitle}>TACTILE HAPTIC FEEDBACK</Text>
                  <Text style={styles.settingsCardDesc}>
                    Crisp physical vibration feedback on episode marks, tab changes, and rating sliders.
                  </Text>
                </View>
              </View>

              <View style={styles.settingActionRow}>
                <Text style={styles.settingStatusLabel}>HAPTIC ENGINE</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, hapticsActive && styles.toggleBtnActive]}
                  onPress={handleToggleHaptics}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleDot, hapticsActive && styles.toggleDotActive]} />
                  <Text style={[styles.toggleText, hapticsActive && styles.toggleTextActive]}>
                    {hapticsActive ? 'ACTIVE' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Data & Compliance Card */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsHeaderRow}>
                <View style={styles.settingsHeaderIconBox}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.settingsCardTitle}>SYSTEM & COMPLIANCE</Text>
                  <Text style={styles.settingsCardDesc}>
                    Architecture, data storage details, and privacy documentation.
                  </Text>
                </View>
              </View>

              <View style={[styles.settingActionRow, { gap: 8 }]}>
                <TouchableOpacity
                  style={[styles.settingsActionBtn, { flex: 1 }]}
                  onPress={() => {
                    feedback.tap();
                    setIsLegalModalOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={12} color={colors.textPrimary} style={{ marginRight: 4 }} />
                  <Text style={styles.settingsActionBtnText}>LEGAL & POLICIES</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsActionBtn, { flex: 1, borderColor: colors.borderLight }]}
                  onPress={handleClearHistory}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={12} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.settingsActionBtnText, { color: colors.accent }]}>DATA CLEAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      <AccountModal
        visible={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />

      <LegalAboutModal
        visible={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        isAuthenticated={isAuthenticated}
        onDeleteAccount={handleDeleteAccount}
        onClearHistory={handleClearHistory}
      />
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerInfoBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  headerAccountBtnText: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
    fontSize: 9.5,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  cardSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  cardSignOutText: {
    fontFamily: typography.fontBold,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },

  // Profile Details Card - Pure Brutalist Typography
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 14,
    marginBottom: 14,
  },
  profileDetails: {
    gap: 12,
  },
  guestDetails: {
    gap: 12,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameBlock: {
    flex: 1,
  },
  profileName: {
    fontFamily: typography.fontBlack,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  profileEmail: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
  },
  statusDotActive: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  statusDotGuest: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textMuted,
    marginRight: 5,
  },
  statusBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },

  // Metrics Bar
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.void,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontFamily: typography.fontBlack,
    fontSize: 16,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  metricLbl: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },

  guestSignInBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  guestSignInBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },

  // Segment Container
  segmentContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 12,
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
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: colors.accent,
  },

  logSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  logSubHeaderText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  clearLogsLink: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },

  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: typography.fontBlack,
    color: colors.textPrimary,
    fontSize: 12,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: typography.fontBody,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: 16,
  },
  emptyExploreBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 2,
  },
  emptyExploreBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  historyCard: {
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
  historyPoster: {
    width: 52,
    height: 78,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userRatingPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 2,
  },
  userRatingPillText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.starYellow,
    includeFontPadding: false,
  },
  formatTag: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  historyDate: {
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  historyTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    includeFontPadding: false,
    marginTop: 2,
  },
  historyEpisode: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    color: colors.textSecondary,
    includeFontPadding: false,
    marginTop: 2,
  },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  deleteIconBtn: {
    padding: 4,
  },
  minimalLedgerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 12,
  },
  heroTimeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  heroTimeOverline: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0.8,
    color: colors.textSecondary,
    includeFontPadding: false,
    marginBottom: 6,
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroTimeValue: {
    fontFamily: typography.fontBlack,
    fontSize: 44,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  heroTimeUnit: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
  ledgerHairline: {
    height: 1,
    backgroundColor: colors.border,
  },
  volumeGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  volumeCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeNumber: {
    fontFamily: typography.fontBlack,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
    marginBottom: 3,
  },
  volumeLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0.5,
    includeFontPadding: false,
  },
  volumeDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  minimalSectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 16,
    marginBottom: 12,
  },
  minimalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  minimalSectionTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0.8,
    includeFontPadding: false,
  },
  minimalSectionMeta: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  minimalStreakBadge: {
    fontFamily: typography.fontBlack,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  ratioBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  ratioBarFill: {
    height: '100%',
  },
  ratioLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  legendText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    includeFontPadding: false,
  },
  genreListWrap: {
    gap: 10,
  },
  genreItemRow: {
    marginBottom: 2,
  },
  genreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  genreNameText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  genrePctText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  genreBarTrack: {
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 1,
    overflow: 'hidden',
  },
  genreBarFill: {
    height: '100%',
  },
  cadenceChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 34,
    gap: 5,
  },
  cadenceBar: {
    flex: 1,
    borderRadius: 1,
  },
  cadenceLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cadenceLegendText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  settingsScrollContent: {
    paddingBottom: 150,
    gap: 12,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 2,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  settingsHeaderIconBox: {
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCardTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginBottom: 3,
  },
  settingsCardDesc: {
    fontFamily: typography.fontBody,
    fontSize: 10.5,
    color: colors.textMuted,
    lineHeight: 15,
  },
  settingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    gap: 6,
  },
  toggleBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  toggleDotActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  toggleTextActive: {
    color: colors.accent,
  },
  settingStatusLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0.5,
    includeFontPadding: false,
  },
  settingSubDesc: {
    fontFamily: typography.fontBody,
    fontSize: 9.5,
    color: colors.textMuted,
    lineHeight: 13,
    marginTop: 2,
  },
  settingsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    justifyContent: 'center',
  },
  settingsActionBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textPrimary,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
});
