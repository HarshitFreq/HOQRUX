import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTracking } from '../../context/TrackingContext';
import { useAuth } from '../../context/AuthContext';
import { AccountModal } from '../../components/AccountModal';
import { StatCard } from '../../components/StatCard';

export default function ActivityScreen() {
  const { user, isAuthenticated, signOut, deleteAccount, savedAccounts, switchAccount } = useAuth();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

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
  const [activeSegment, setActiveSegment] = useState<'history' | 'stats' | 'about'>('history');

  useFocusEffect(
    useCallback(() => {
      refreshTracking();
    }, [refreshTracking])
  );

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

  const trackedCount = Object.keys(tracking || {}).length;
  const listCount = watchlists?.length || 0;
  const logCount = history?.length || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Minimal Clean Profile Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={styles.headerActions}>
            {isAuthenticated ? (
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.signOutHeaderBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={styles.signOutHeaderBtnText}>SIGN OUT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAccountModalOpen(true);
                }}
                style={styles.signInHeaderBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="log-in-outline" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={styles.signInHeaderBtnText}>SIGN IN</Text>
              </TouchableOpacity>
            )}
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
                <View style={styles.statusBadge}>
                  <View style={styles.statusDotActive} />
                  <Text style={styles.statusBadgeText}>ACTIVE</Text>
                </View>
              </View>

              {/* Metrics Strip */}
              <View style={styles.metricsBar}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{trackedCount}</Text>
                  <Text style={styles.metricLbl}>TITLES</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{listCount}</Text>
                  <Text style={styles.metricLbl}>LISTS</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{logCount}</Text>
                  <Text style={styles.metricLbl}>LOGS</Text>
                </View>
              </View>

              {/* Saved accounts switcher if multiple profiles saved on device */}
              {savedAccounts.length > 1 && (
                <View style={styles.switcherBox}>
                  <Text style={styles.switcherLabel}>SWITCH PROFILE:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switcherScroll}>
                    {savedAccounts.map((acc) => {
                      const isCurrent = acc.id === user.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.accountPill, isCurrent && styles.accountPillActive]}
                          onPress={async () => {
                            if (!isCurrent) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              await switchAccount(acc.id);
                              await refreshTracking();
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.accountPillText, isCurrent && styles.accountPillTextActive]}>
                            {acc.username || acc.email}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
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

              {/* Metrics Strip */}
              <View style={styles.metricsBar}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{trackedCount}</Text>
                  <Text style={styles.metricLbl}>TITLES</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{listCount}</Text>
                  <Text style={styles.metricLbl}>LISTS</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{logCount}</Text>
                  <Text style={styles.metricLbl}>LOGS</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.guestSignInBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsAccountModalOpen(true);
                }}
              >
                <Text style={styles.guestSignInBtnText}>SIGN IN / CREATE ACCOUNT →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabular Segment Switcher */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
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
              Haptics.selectionAsync();
              setActiveSegment('stats');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'stats' && styles.segmentTextActive]}>
              STATS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'about' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveSegment('about');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'about' && styles.segmentTextActive]}>
              ABOUT & DATA
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
                        <Text style={styles.formatTag}>
                          {entry.mediaType === 'tv' ? 'SERIES' : 'FILM'}
                        </Text>
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

        {/* Segment 2: Viewing Stats & Habits */}
        {activeSegment === 'stats' && (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Stat Matrix */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  label="Time Logged"
                  value={`${stats.totalHoursWatched}h`}
                  subValue="Watch time"
                />
                <StatCard
                  label="Episodes"
                  value={stats.totalEpisodesWatched}
                  subValue="Watched"
                  accentColor={colors.accent}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  label="Films"
                  value={stats.totalMoviesWatched}
                  subValue="Completed"
                />
                <StatCard
                  label="Average Rating"
                  value="4.7★"
                  subValue="Mean score"
                  accentColor={colors.starYellow}
                />
              </View>
            </View>

            {/* Streak & Cadence */}
            <View style={styles.streakSection}>
              <View style={styles.streakHeader}>
                <Text style={styles.sectionHeaderTitle}>VIEWING CADENCE</Text>
                <Text style={styles.streakBadge}>{stats.streakDays}D STREAK</Text>
              </View>
              <Text style={styles.streakSubText}>
                {history.length > 0
                  ? `${Math.min(history.length, 14)} viewing sessions registered.`
                  : 'Start watching to build your cadence.'}
              </Text>
              <View style={styles.cadenceChart}>
                {[40, 60, 20, 50, 30, 70, 15, 60, 80, 100, 45, 65, 85, 30].map(
                  (val, idx) => {
                    const isRecent = idx >= 10;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.cadenceBar,
                          {
                            height: Math.max(val * 0.35, 6),
                            backgroundColor: isRecent
                              ? colors.accent
                              : idx > 6
                              ? '#FFFFFF'
                              : '#22222C',
                          },
                        ]}
                      />
                    );
                  }
                )}
              </View>
            </View>

            {/* Genre Breakdown */}
            <View style={styles.genreBreakdownSection}>
              <Text style={styles.sectionHeaderTitle}>TOP GENRES</Text>
              {stats.topGenres.map((g) => (
                <View key={g.genre} style={styles.genreBarRow}>
                  <View style={styles.genreLabelRow}>
                    <Text style={styles.genreName}>{g.genre.toUpperCase()}</Text>
                    <Text style={styles.genrePct}>{g.percentage}%</Text>
                  </View>
                  <View style={styles.genreTrack}>
                    <View
                      style={[
                        styles.genreFill,
                        {
                          width: `${g.percentage}%`,
                          backgroundColor:
                            g.genre === 'Drama'
                              ? '#FFFFFF'
                              : g.genre === 'Sci-Fi'
                              ? colors.accent
                              : colors.borderLight,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Segment 3: About, Legal, TMDb Attribution & Data Purge */}
        {activeSegment === 'about' && (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.aboutContent}
            showsVerticalScrollIndicator={false}
          >
            {/* App Meta Section */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutCardTitle}>HOQRUX // ARCHITECTURE</Text>
              <Text style={styles.aboutCardSubtitle}>
                Pure Swiss Brutalist cinema, television, and anime tracker. Built with local-first persistence, dual-layer caching, and real-time cloud synchronization.
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>VERSION</Text>
                <Text style={styles.metaValue}>1.0.0 (RELEASE)</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>CLIENT</Text>
                <Text style={styles.metaValue}>EXPO 58 // REACT 19</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>DATABASE</Text>
                <Text style={styles.metaValue}>{isAuthenticated ? 'SUPABASE CLOUD + LOCAL' : 'OFFLINE LOCAL-FIRST'}</Text>
              </View>
            </View>

            {/* Mandatory TMDb Attribution Section (Google Play / TMDb Compliance) */}
            <View style={styles.aboutCard}>
              <View style={styles.tmdbHeaderRow}>
                <Text style={styles.aboutCardTitle}>DATA SOURCES & ATTRIBUTION</Text>
                <View style={styles.tmdbBadge}>
                  <Text style={styles.tmdbBadgeText}>TMDB API</Text>
                </View>
              </View>
              <Text style={styles.tmdbDisclaimerText}>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </Text>
              <Text style={styles.aboutCardSubtitle}>
                Film, television, streaming availability, and anime catalog records are supplied by The Movie Database (TMDb), AniList, and TVmaze.
              </Text>
            </View>

            {/* Legal & Privacy Policy Links (Google Play Mandate) */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutCardTitle}>LEGAL & POLICIES</Text>
              <TouchableOpacity
                style={styles.legalLinkRow}
                onPress={() => Linking.openURL('https://github.com/HarshitFreq/HOQRUX/blob/main/docs/PRIVACY_POLICY.md')}
                activeOpacity={0.7}
              >
                <View style={styles.legalLinkLeft}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={colors.textPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.legalLinkText}>Privacy Policy</Text>
                </View>
                <Ionicons name="open-outline" size={13} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.legalLinkRow}
                onPress={() => Linking.openURL('https://github.com/HarshitFreq/HOQRUX/blob/main/docs/ACCOUNT_DELETION.md')}
                activeOpacity={0.7}
              >
                <View style={styles.legalLinkLeft}>
                  <Ionicons name="trash-bin-outline" size={15} color={colors.textPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.legalLinkText}>Account & Data Deletion</Text>
                </View>
                <Ionicons name="open-outline" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Danger Zone: Account & Data Purge (Google Play Mandate) */}
            <View style={styles.dangerZoneCard}>
              <Text style={styles.dangerZoneTitle}>DATA PURGE // DANGER ZONE</Text>
              <Text style={styles.dangerZoneDesc}>
                Permanently purge all user records, lists, ratings, and viewing history. This action cannot be reversed.
              </Text>

              {isAuthenticated ? (
                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={handleDeleteAccount}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.deleteAccountBtnText}>DELETE ACCOUNT & PURGE ALL DATA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={handleClearHistory}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.deleteAccountBtnText}>PURGE ALL LOCAL DEVICE DATA</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <AccountModal
        visible={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#3A1418',
    backgroundColor: '#16080A',
    borderRadius: 2,
  },
  signOutHeaderBtnText: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 9.5,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  signInHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    borderRadius: 2,
  },
  signInHeaderBtnText: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 9.5,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
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

  // Profile Switcher
  switcherBox: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  switcherLabel: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginBottom: 6,
  },
  switcherScroll: {
    flexDirection: 'row',
  },
  accountPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    marginRight: 6,
  },
  accountPillActive: {
    borderColor: colors.accent,
    backgroundColor: '#1E0E12',
  },
  accountPillText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
  },
  accountPillTextActive: {
    color: colors.accent,
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
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  segmentText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: '#050507',
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
    paddingBottom: 100,
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
  statsGrid: {
    gap: 10,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  streakSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 14,
    marginBottom: 14,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  streakBadge: {
    fontFamily: typography.fontBlack,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  streakSubText: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 12,
  },
  cadenceChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 38,
    gap: 5,
  },
  cadenceBar: {
    flex: 1,
    borderRadius: 1,
  },
  genreBreakdownSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 14,
  },
  genreBarRow: {
    marginTop: 10,
  },
  genreLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  genreName: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  genrePct: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.textMuted,
  },
  genreTrack: {
    height: 2,
    backgroundColor: colors.border,
  },
  genreFill: {
    height: '100%',
  },

  // About, Legal & Data Purge Styles
  aboutContent: {
    paddingBottom: 110,
    gap: 12,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  aboutCardTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  aboutCardSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
    marginTop: 6,
  },
  metaLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  metaValue: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: colors.textPrimary,
  },
  tmdbHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tmdbBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
  },
  tmdbBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: colors.accent,
  },
  tmdbDisclaimerText: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  legalLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
    marginTop: 6,
  },
  legalLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLinkText: {
    fontFamily: typography.fontBold,
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  dangerZoneCard: {
    backgroundColor: '#16080A',
    borderWidth: 1,
    borderColor: '#3A1418',
    padding: 14,
    marginTop: 6,
  },
  dangerZoneTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.accent,
    marginBottom: 6,
  },
  dangerZoneDesc: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#E09BA0',
    marginBottom: 12,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#2A0D11',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  deleteAccountBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.accent,
  },
});
