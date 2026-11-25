import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '../../utils/haptics';
import { feedback } from '../../utils/feedback';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useTracking } from '../../context/TrackingContext';
import { tmdbService } from '../../services/tmdb';
import { mediaEngine } from '../../services/api/mediaEngine';
import { MediaItem, WatchStatus, CollectionInfo } from '../../services/types';
import { EpisodeItem } from '../../components/EpisodeItem';
import { StreamingBadge } from '../../components/StreamingBadge';
import { RatingStars } from '../../components/RatingStars';
import { ShareCardModal } from '../../components/ShareCardModal';
import { NativeTitleLogo } from '../../components/NativeTitleLogo';
import { getCanonicalMediaType } from '../../services/api/tmdbLogo';
import { FranchiseCollectionCard } from '../../components/FranchiseCollectionCard';
import { trailerService } from '../../services/trailerService';
import { INITIAL_MEDIA_ITEMS } from '../../services/mockData';
import { computeCountdown } from '../../services/airingCalendarService';

export default function TitleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isIOS =
    Platform.OS === 'ios' ||
    (Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent || ''));
  const topNavPadding = Math.max(insets.top, isIOS ? 46 : 10);
  const {
    getTrackingForTitle,
    setWatchStatus,
    setRating,
    setReview,
    toggleFavorite,
    markSeasonWatched,
    markEpisodesUpTo,
    getShowProgress,
    getEpisodeProgress,
    toggleEpisodeWatched,
    watchlists,
    toggleTitleInWatchlist,
    cacheMediaItem,
    resolveMediaItem,
  } = useTracking();

  const initialItem = useMemo(() => {
    if (!id) return null;
    return resolveMediaItem(id) || INITIAL_MEDIA_ITEMS.find((m) => m.id === id) || null;
  }, [id, resolveMediaItem]);

  const [item, setItem] = useState<MediaItem | null>(initialItem);
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes'>('overview');
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchSeasonNumber, setBatchSeasonNumber] = useState(1);
  const [batchEpisodeNumber, setBatchEpisodeNumber] = useState(1);
  const [reviewText, setReviewText] = useState('');
  const [isReviewEditing, setIsReviewEditing] = useState(false);
  const [fetchedCollection, setFetchedCollection] = useState<CollectionInfo | null>(null);

  const collection = item?.collection || fetchedCollection;

  useEffect(() => {
    let isMounted = true;
    if (!item?.collection) {
      if (item?.belongs_to_collection?.id) {
        tmdbService.getCollection(item.belongs_to_collection.id).then((col) => {
          if (col && isMounted) {
            setFetchedCollection(col);
          }
        });
      } else if (item?.type === 'movie' && item.tmdbId) {
        tmdbService.getMediaDetails(`movie-${item.tmdbId}`).then((details) => {
          if (details?.collection && isMounted) {
            setFetchedCollection(details.collection);
          } else if (details?.belongs_to_collection?.id && isMounted) {
            tmdbService.getCollection(details.belongs_to_collection.id).then((col) => {
              if (col && isMounted) {
                setFetchedCollection(col);
              }
            });
          }
        });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [item?.collection, item?.belongs_to_collection?.id, item?.type, item?.tmdbId]);

  useEffect(() => {
    let isMounted = true;
    async function loadItem() {
      if (!id) return;
      const initial = resolveMediaItem(id) || INITIAL_MEDIA_ITEMS.find((m) => m.id === id) || null;
      if (initial && isMounted) {
        setItem(initial);
        if (initial.seasons && initial.seasons.length > 0) {
          setSelectedSeasonNumber((prev) =>
            initial.seasons?.some((s) => s.seasonNumber === prev) ? prev : initial.seasons![0].seasonNumber
          );
        }
      }
      try {
        const enriched = await mediaEngine.getEnrichedDetails(id);
        if (enriched && isMounted) {
          setItem(enriched);
          cacheMediaItem(enriched);
          if (enriched.seasons && enriched.seasons.length > 0) {
            setSelectedSeasonNumber((prev) =>
              enriched.seasons?.some((s) => s.seasonNumber === prev) ? prev : enriched.seasons![0].seasonNumber
            );
          }
        }
      } catch {
        // Keep initial item if enrichment fails
      }
    }
    loadItem();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const tracking = id ? getTrackingForTitle(id) : undefined;

  const startReviewEdit = () => {
    setReviewText(tracking?.review || '');
    setIsReviewEditing(true);
  };

  const isSeries = Boolean(
    item && (
      item.type === 'tv' ||
      (item.type === 'anime' && (Boolean(item.seasons && item.seasons.length > 0) || (item.totalEpisodes && item.totalEpisodes > 1))) ||
      (item.seasons && item.seasons.length > 0 && item.seasons.some((s) => s.episodes.length > 1))
    )
  );

  const nextUnwatchedEpisode = useMemo(() => {
    if (!item || !isSeries || !item.seasons) return null;
    for (const s of item.seasons) {
      for (const ep of s.episodes) {
        if (!getEpisodeProgress(item.id, ep.seasonNumber, ep.episodeNumber)) {
          return ep;
        }
      }
    }
    return null;
  }, [item, isSeries, getEpisodeProgress]);

  const batchSeasonObj = useMemo(() => {
    return item?.seasons?.find((s) => s.seasonNumber === batchSeasonNumber) || item?.seasons?.[0];
  }, [item, batchSeasonNumber]);

  const batchEpisodesList = useMemo(() => {
    return batchSeasonObj?.episodes || [];
  }, [batchSeasonObj]);

  const totalEpisodesToMark = useMemo(() => {
    if (!item?.seasons) return batchEpisodeNumber;
    let count = 0;
    for (const s of item.seasons) {
      if (s.seasonNumber < batchSeasonNumber) {
        count += s.episodes.length;
      } else if (s.seasonNumber === batchSeasonNumber) {
        count += Math.min(batchEpisodeNumber, s.episodes.length);
        break;
      }
    }
    return count;
  }, [item, batchSeasonNumber, batchEpisodeNumber]);

  const handleSeasonSelect = async (seasonNum: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSeasonNumber(seasonNum);

    const targetSeason = item?.seasons?.find((s) => s.seasonNumber === seasonNum);
    const hasPlaceholders = targetSeason && targetSeason.episodes.some((e) => e.title === `Episode ${e.episodeNumber}`);
    const tmdbTvId = item?.externalIds?.tmdb || (item?.sourceProvider === 'tmdb' ? item?.tmdbId : undefined);

    if (hasPlaceholders && tmdbTvId) {
      try {
        const liveEpisodes = await tmdbService.getSeasonEpisodes(tmdbTvId, seasonNum);
        if (liveEpisodes && liveEpisodes.length > 0 && item) {
          setItem((prev) => {
            if (!prev || !prev.seasons) return prev;
            const updatedSeasons = prev.seasons.map((s) =>
              s.seasonNumber === seasonNum ? { ...s, episodes: liveEpisodes, episodeCount: liveEpisodes.length } : s
            );
            const updatedItem = { ...prev, seasons: updatedSeasons };
            cacheMediaItem(updatedItem);
            return updatedItem;
          });
        }
      } catch {
        // keep current
      }
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const selectedSeason = item.seasons?.find(
    (s) => s.seasonNumber === selectedSeasonNumber
  );

  const progress = isSeries ? getShowProgress(item) : null;

  const handleStatusChange = async (status: WatchStatus) => {
    feedback.success();
    if (item) await cacheMediaItem(item);
    setWatchStatus(item, status);
  };

  const handleRatingChange = (newRating: number) => {
    feedback.toggle();
    cacheMediaItem(item);
    setRating(item.id, newRating);
  };

  const handleSaveReview = () => {
    feedback.success();
    setReview(item.id, reviewText);
    setIsReviewEditing(false);
  };

  const handleToggleFavorite = () => {
    feedback.toggle();
    toggleFavorite(item.id);
  };

  const isEntireSeasonWatched = Boolean(
    selectedSeason &&
    selectedSeason.episodes.length > 0 &&
    selectedSeason.episodes.every((ep) =>
      getEpisodeProgress(item.id, ep.seasonNumber, ep.episodeNumber)
    )
  );

  const handleToggleCurrentSeasonWatched = () => {
    if (!selectedSeason) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markSeasonWatched(item, selectedSeasonNumber, !isEntireSeasonWatched);
  };

  const handleConfirmBatchLog = async () => {
    if (!item) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markEpisodesUpTo(item, batchSeasonNumber, batchEpisodeNumber, true);
    setIsBatchModalOpen(false);
  };

  const mediaTypeLabel = isSeries
    ? (item.type === 'anime' ? 'ANIME SERIES' : 'SERIES')
    : (item.type === 'anime' ? 'ANIME FILM' : 'FILM');

  const totalEpisodesCount = item.totalEpisodes || (item.seasons ? item.seasons.reduce((acc, s) => acc + s.episodes.length, 0) : 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Backdrop Header */}
        <View style={styles.backdropContainer}>
          <Image
            source={{ uri: item.backdropPath || item.posterPath }}
            style={styles.backdropImage}
            contentFit="cover"
            priority="high"
            transition={150}
            cachePolicy="memory-disk"
          />
          {/* Top Status Bar Blend Gradient */}
          <LinearGradient
            colors={['rgba(5, 5, 7, 0.85)', 'rgba(5, 5, 7, 0.25)', 'transparent']}
            locations={[0, 0.55, 1]}
            style={styles.topBackdropGradient}
          />
          {/* Bottom Fade Gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(5, 5, 7, 0.7)', colors.void]}
            locations={[0, 0.5, 1]}
            style={styles.backdropGradient}
          />

          {/* Floating Nav */}
          <View style={[styles.floatingNav, { paddingTop: topNavPadding }]}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={styles.navIconButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.navRightRow}>
              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={[
                  styles.navIconButton,
                  tracking?.favorite && styles.navIconButtonActive,
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={tracking?.favorite ? 'heart' : 'heart-outline'}
                  size={18}
                  color={tracking?.favorite ? colors.accent : colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsShareModalOpen(true)}
                style={styles.navIconButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero Details */}
        <View style={styles.heroSection}>
          <View style={styles.posterAndMetaRow}>
            <Image
              source={{ uri: item.posterPath }}
              style={styles.heroPoster}
              contentFit="cover"
              priority="high"
              transition={150}
              cachePolicy="memory-disk"
            />
            <View style={styles.heroMetaDetails}>
              {/* Overline Badge */}
              <View style={styles.formatTagRow}>
                <View style={styles.formatTag}>
                  <Text style={styles.formatTagText}>{mediaTypeLabel}</Text>
                </View>
                <Text style={styles.releaseYearText}>{item.releaseYear}</Text>
              </View>

              {/* Title / Logo */}
              <NativeTitleLogo
                mediaType={getCanonicalMediaType(item)}
                id={item.tmdbId || item.id}
                title={item.title}
                originalLanguage={item.originalLanguage}
              />

              {/* Specs & Ratings Micro-Row */}
              <View style={styles.specsInlineRow}>
                <Text style={styles.specsRuntime}>
                  {isSeries
                    ? `${totalEpisodesCount || 10} EPISODES`
                    : `${item.runtime || 120} MIN`}
                </Text>

                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color={colors.starYellow} style={{ marginRight: 3 }} />
                  <Text style={styles.ratingBadgeText}>{item.tmdbRating.toFixed(1)}</Text>
                  <Text style={styles.ratingBadgeLabel}>TMDB</Text>
                </View>

                {item.imdbRating ? (
                  <View style={[styles.ratingBadge, styles.imdbBadge]}>
                    <Text style={styles.ratingBadgeText}>{item.imdbRating.toFixed(1)}</Text>
                    <Text style={styles.ratingBadgeLabel}>IMDB</Text>
                  </View>
                ) : null}
              </View>

              {/* Genre Tags */}
              <View style={styles.genresRow}>
                {item.genres.slice(0, 3).map((g) => (
                  <View key={g} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{g.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Unified Action Hub */}
          <View style={styles.actionHubCard}>
            {/* Status Segmented Control */}
            <View style={styles.statusSegmentContainer}>
              {(['watching', 'plan_to_watch', 'completed'] as const).map((st) => {
                const isActive = tracking?.status === st;
                const labels = {
                  watching: 'WATCHING',
                  plan_to_watch: 'WANT TO WATCH',
                  completed: 'COMPLETED',
                };
                return (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.75}
                    onPress={() => handleStatusChange(st)}
                    style={[styles.statusSegmentBtn, isActive && styles.statusSegmentBtnActive]}
                  >
                    <Text style={[styles.statusSegmentText, isActive && styles.statusSegmentTextActive]}>
                      {labels[st]}
                    </Text>
                    {isActive && <View style={styles.statusActiveIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rating & Quick Action Row */}
            <View style={styles.actionBody}>
              <View style={styles.ratingRow}>
                <View style={styles.ratingInfo}>
                  <Text style={styles.ratingLabel}>YOUR RATING</Text>
                  <Text style={styles.ratingValueText}>
                    {tracking?.rating ? `${tracking.rating.toFixed(1)} / 5.0` : 'Tap stars to rate'}
                  </Text>
                </View>
                <RatingStars
                  rating={tracking?.rating || 0}
                  size={20}
                  interactive
                  onRatingChange={handleRatingChange}
                  showNumeric={false}
                />
              </View>

              {/* Essential Action Pills: Watchlist & Official Trailer */}
              <View style={styles.actionPillsRow}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => setIsListModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark-outline" size={13} color={colors.textPrimary} style={{ marginRight: 5 }} />
                  <Text style={styles.actionPillText}>WATCHLIST</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => trailerService.openTrailer(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-youtube" size={13} color="#FF0000" style={{ marginRight: 5 }} />
                  <Text style={styles.actionPillText}>OFFICIAL TRAILER</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Series Navigation Tabs (Overview vs Episodes) */}
          {isSeries && (
            <View style={styles.seriesTabsContainer}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('overview');
                }}
                style={[styles.seriesTabItem, activeTab === 'overview' && styles.seriesTabItemActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.seriesTabText, activeTab === 'overview' && styles.seriesTabTextActive]}>
                  OVERVIEW
                </Text>
                {activeTab === 'overview' && <View style={styles.seriesTabLine} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('episodes');
                }}
                style={[styles.seriesTabItem, activeTab === 'episodes' && styles.seriesTabItemActive]}
                activeOpacity={0.8}
              >
                <View style={styles.seriesTabWithCount}>
                  <Text style={[styles.seriesTabText, activeTab === 'episodes' && styles.seriesTabTextActive]}>
                    EPISODES
                  </Text>
                  {progress ? (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>
                        {progress.watchedCount}/{progress.totalCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {activeTab === 'episodes' && <View style={styles.seriesTabLine} />}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 1: OVERVIEW CONTENT (or Movie Content) */}
          {(!isSeries || activeTab === 'overview') && (
            <View>
              {/* Synopsis / Story */}
              {item.overview ? (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionHeaderTitle}>SYNOPSIS</Text>
                  <Text style={styles.overviewText}>{item.overview}</Text>
                </View>
              ) : null}

              {/* Where to Watch */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionHeaderTitle}>WHERE TO WATCH</Text>
                <View style={styles.providersRow}>
                  {(item.providers || tmdbService.generateFallbackProviders(item.title)).map(
                    (prov) => (
                      <StreamingBadge key={prov.id} provider={prov} mediaTitle={item.title} />
                    )
                  )}
                </View>
              </View>

              {/* Franchise & Collection Order (Chronological Timeline) */}
              {collection && (
                <FranchiseCollectionCard
                  collection={collection}
                  currentTmdbId={item.tmdbId}
                />
              )}


              {/* Personal Journal / Notes */}
              <View style={styles.sectionContainer}>
                <View style={styles.reviewHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>PERSONAL REFLECTIONS</Text>
                  {!isReviewEditing && (
                    <TouchableOpacity onPress={startReviewEdit} activeOpacity={0.7}>
                      <Text style={styles.editReviewLink}>
                        {tracking?.review ? 'EDIT' : '+ ADD NOTE'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isReviewEditing ? (
                  <View style={styles.reviewEditBox}>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Record private thoughts, favorite moments, or reactions..."
                      placeholderTextColor={colors.textMuted}
                      value={reviewText}
                      onChangeText={setReviewText}
                      multiline
                    />
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        onPress={() => setIsReviewEditing(false)}
                        style={styles.reviewCancelBtn}
                      >
                        <Text style={styles.reviewCancelText}>DISCARD</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveReview}
                        style={styles.reviewSaveBtn}
                      >
                        <Text style={styles.reviewSaveText}>SAVE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : tracking?.review ? (
                  <View style={styles.reviewDisplayBox}>
                    <Text style={styles.reviewDisplayText}>“{tracking.review}”</Text>
                  </View>
                ) : (
                  <Text style={styles.emptyReviewPrompt}>
                    {'No private notes recorded. Tap "+ Add Note" to log reflections.'}
                  </Text>
                )}
              </View>

              {/* Cast & Characters Shelf with Portrait Photos */}
              {item.cast && item.cast.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.castHeaderRow}>
                    <Text style={styles.sectionHeaderTitle}>CAST & CHARACTERS</Text>
                    <Text style={styles.castCountBadge}>{item.cast.length} ACTORS</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.castScrollContainer}
                    decelerationRate="fast"
                  >
                    {item.cast.map((c, i) => {
                      const initials = (c.name || '?')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <View key={`${c.name}-${i}`} style={styles.castCard}>
                          <View style={styles.castPhotoWrapper}>
                            {c.profilePath ? (
                              <Image
                                source={{ uri: c.profilePath }}
                                style={styles.castPhoto}
                                contentFit="cover"
                                transition={150}
                                cachePolicy="memory-disk"
                              />
                            ) : (
                              <View style={styles.castPhotoFallback}>
                                <Ionicons name="person" size={24} color={colors.textMuted} />
                                <Text style={styles.castInitials}>{initials}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.actorName} numberOfLines={2}>
                            {c.name}
                          </Text>
                          {c.character ? (
                            <Text style={styles.characterName} numberOfLines={1}>
                              {c.character}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: EPISODES CONTENT (Dedicated Series View) */}
          {isSeries && activeTab === 'episodes' && (
            <View style={styles.episodesTabContent}>
              {/* Overall Progress Tracker */}
              {progress && (
                <View style={styles.progressCard}>
                  <View style={styles.progressCardHeader}>
                    <Text style={styles.progressLabel}>SERIES PROGRESS</Text>
                    <Text style={styles.progressStats}>
                      {progress.watchedCount} of {progress.totalCount} ({progress.percentage}%)
                    </Text>
                  </View>
                  <View style={styles.fullProgressTrack}>
                    <View
                      style={[
                        styles.fullProgressFill,
                        { width: `${progress.percentage}%` },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Quick Next Episode Logging Banner */}
              {nextUnwatchedEpisode && (
                <View style={styles.nextUpCard}>
                  <View style={styles.nextUpThumbContainer}>
                    <Image
                      source={{
                        uri:
                          nextUnwatchedEpisode.stillPath ||
                          item.backdropPath ||
                          item.posterPath,
                      }}
                      style={styles.nextUpThumbImage}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  </View>
                  <View style={styles.nextUpLeft}>
                    <View style={styles.nextUpTag}>
                      <Text style={styles.nextUpTagText}>NEXT UP TO LOG</Text>
                    </View>
                    <Text style={styles.nextUpTitle} numberOfLines={1}>
                      S{nextUnwatchedEpisode.seasonNumber} · E
                      {nextUnwatchedEpisode.episodeNumber < 10
                        ? `0${nextUnwatchedEpisode.episodeNumber}`
                        : nextUnwatchedEpisode.episodeNumber}{' '}
                      {nextUnwatchedEpisode.title}
                    </Text>
                    <Text style={styles.nextUpMeta}>
                      {nextUnwatchedEpisode.runtime || item.runtime || 45} MIN
                      {nextUnwatchedEpisode.airDate ? ` • ${nextUnwatchedEpisode.airDate}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.nextUpLogBtn}
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      toggleEpisodeWatched(
                        item,
                        nextUnwatchedEpisode.seasonNumber,
                        nextUnwatchedEpisode.episodeNumber,
                        nextUnwatchedEpisode.title,
                        nextUnwatchedEpisode.runtime
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
                    <Text style={styles.nextUpLogBtnText}>
                      LOG E{nextUnwatchedEpisode.episodeNumber}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Release Radar: Upcoming Broadcast Banner */}
              {isSeries && item.nextEpisodeToAir && (
                <View style={styles.upcomingBroadcastCard}>
                  <View style={styles.upcomingBroadcastTop}>
                    <View style={styles.broadcastLeft}>
                      <View style={styles.broadcastDot} />
                      <Text style={styles.broadcastLabel}>RELEASE RADAR // NEXT BROADCAST</Text>
                    </View>
                    {item.network ? (
                      <View style={styles.broadcastNetworkPill}>
                        <Text style={styles.broadcastNetworkText}>{item.network.toUpperCase()}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.broadcastDetailsRow}>
                    <View style={styles.broadcastInfoCol}>
                      <Text style={styles.broadcastEpisodeText} numberOfLines={1}>
                        S{item.nextEpisodeToAir.seasonNumber < 10 ? `0${item.nextEpisodeToAir.seasonNumber}` : item.nextEpisodeToAir.seasonNumber} • E{item.nextEpisodeToAir.episodeNumber < 10 ? `0${item.nextEpisodeToAir.episodeNumber}` : item.nextEpisodeToAir.episodeNumber} {item.nextEpisodeToAir.title ? `"${item.nextEpisodeToAir.title}"` : ''}
                      </Text>
                      <Text style={styles.broadcastDateText}>
                        {new Date(item.nextEpisodeToAir.airDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>

                    {(() => {
                      const countdown = computeCountdown(item.nextEpisodeToAir.airDate);
                      return (
                        <View
                          style={[
                            styles.broadcastCountdownPill,
                            {
                              borderColor: countdown.badgeColor,
                              backgroundColor:
                                countdown.daysUntil === 0
                                  ? 'rgba(229, 9, 20, 0.15)'
                                  : countdown.daysUntil === 1
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                            },
                          ]}
                        >
                          <Text style={[styles.broadcastCountdownText, { color: countdown.badgeColor }]}>
                            {countdown.countdownLabel}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  <TouchableOpacity
                    style={styles.broadcastRadarLink}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push('/radar');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.broadcastRadarLinkText}>VIEW COMPLETE AIRING SCHEDULE →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Season Selector Tabs */}
              {item.seasons && item.seasons.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.seasonsScrollRow}
                >
                  {item.seasons.map((s) => (
                    <TouchableOpacity
                      key={s.seasonNumber}
                      onPress={() => handleSeasonSelect(s.seasonNumber)}
                      style={[
                        styles.seasonTab,
                        selectedSeasonNumber === s.seasonNumber && styles.seasonTabActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.seasonTabText,
                          selectedSeasonNumber === s.seasonNumber && styles.seasonTabTextActive,
                        ]}
                      >
                        Season {s.seasonNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Season Toolbar & Batch Log Trigger */}
              <View style={styles.seasonActionBar}>
                <Text style={styles.seasonStatusText}>
                  Season {selectedSeasonNumber} • {selectedSeason?.episodes.length || 0} Episodes
                </Text>
                <View style={styles.seasonActionsGroup}>
                  <TouchableOpacity
                    onPress={() => {
                      setBatchSeasonNumber(selectedSeasonNumber);
                      setBatchEpisodeNumber(1);
                      setIsBatchModalOpen(true);
                    }}
                    style={styles.batchLogTriggerBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play-forward-outline" size={11} color={colors.accent} />
                    <Text style={styles.batchLogTriggerText}>LOG UP TO...</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleCurrentSeasonWatched}
                    style={[
                      styles.markSeasonBtn,
                      isEntireSeasonWatched && styles.markSeasonBtnClear,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isEntireSeasonWatched ? 'close-circle-outline' : 'checkmark-done'}
                      size={13}
                      color={isEntireSeasonWatched ? colors.textMuted : colors.accent}
                    />
                    <Text
                      style={[
                        styles.markSeasonText,
                        isEntireSeasonWatched && styles.markSeasonTextClear,
                      ]}
                    >
                      {isEntireSeasonWatched ? 'Clear Season' : 'Mark All Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Episode Checklist */}
              {selectedSeason?.episodes.map((ep) => (
                <EpisodeItem key={ep.id} episode={ep} mediaItem={item} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Share Card Modal */}
      <ShareCardModal
        visible={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        mediaItem={item}
        tracking={tracking}
      />

      {/* Add To Watchlist Modal */}
      <Modal
        visible={isListModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsListModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>ADD TO WATCHLIST</Text>
              <TouchableOpacity
                onPress={() => setIsListModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {watchlists.map((wl) => {
                const inList = wl.titleIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={wl.id}
                    onPress={async () => {
                      if (item) await cacheMediaItem(item);
                      toggleTitleInWatchlist(wl.id, item.id, item);
                    }}
                    style={styles.watchlistSelectItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.watchlistSelectLeft}>
                      <View
                        style={[
                          styles.watchlistDot,
                          { backgroundColor: wl.accentColor || colors.accent },
                        ]}
                      />
                      <Text style={styles.watchlistSelectName}>{wl.name}</Text>
                    </View>
                    <Text style={[styles.watchlistStatusBadge, inList && styles.watchlistStatusActive]}>
                      {inList ? 'ADDED' : '+ ADD'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Batch Log Progress Modal */}
      <Modal
        visible={isBatchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBatchModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.batchModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.batchModalOverline}>WATCHING PROGRESS</Text>
                <Text style={styles.modalTitle}>LOG UP TO EPISODE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBatchModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.batchModalInstructions}>
              Select the latest episode you have completed. All prior episodes and seasons will be marked as watched.
            </Text>

            {/* Season Selector */}
            <Text style={styles.batchSectionLabel}>1. SELECT SEASON</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.batchSeasonScroll}
            >
              {(item.seasons || []).map((s) => {
                const isSelected = s.seasonNumber === batchSeasonNumber;
                return (
                  <TouchableOpacity
                    key={`batch-s-${s.seasonNumber}`}
                    style={[
                      styles.batchSeasonTab,
                      isSelected && styles.batchSeasonTabActive,
                    ]}
                    onPress={() => {
                      setBatchSeasonNumber(s.seasonNumber);
                      setBatchEpisodeNumber(1);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.batchSeasonTabText,
                        isSelected && styles.batchSeasonTabTextActive,
                      ]}
                    >
                      Season {s.seasonNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Episode Selector */}
            <Text style={styles.batchSectionLabel}>2. SELECT EPISODE COMPLETED</Text>
            <ScrollView style={styles.batchEpisodesScroll} showsVerticalScrollIndicator={true}>
              <View style={styles.batchEpisodesGrid}>
                {batchEpisodesList.map((ep) => {
                  const isSelected = ep.episodeNumber === batchEpisodeNumber;
                  const epNumStr = ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : `${ep.episodeNumber}`;
                  return (
                    <TouchableOpacity
                      key={`batch-ep-${ep.episodeNumber}`}
                      style={[
                        styles.batchEpisodePill,
                        isSelected && styles.batchEpisodePillActive,
                      ]}
                      onPress={() => setBatchEpisodeNumber(ep.episodeNumber)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.batchEpisodePillText,
                          isSelected && styles.batchEpisodePillTextActive,
                        ]}
                      >
                        E{epNumStr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Selected Episode Summary Preview */}
            <View style={styles.batchSelectionPreview}>
              <Text style={styles.batchSelectionTarget} numberOfLines={1}>
                S{batchSeasonNumber < 10 ? `0${batchSeasonNumber}` : batchSeasonNumber}:E{batchEpisodeNumber < 10 ? `0${batchEpisodeNumber}` : batchEpisodeNumber}
                {'  '}
                {batchEpisodesList.find(e => e.episodeNumber === batchEpisodeNumber)?.title || `Episode ${batchEpisodeNumber}`}
              </Text>
              <Text style={styles.batchSelectionMeta}>
                Marks {totalEpisodesToMark} episode{totalEpisodesToMark === 1 ? '' : 's'} as completed in your active log
              </Text>
            </View>

            {/* Confirm Actions */}
            <View style={styles.batchModalActions}>
              <TouchableOpacity
                onPress={() => setIsBatchModalOpen(false)}
                style={styles.batchCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.batchCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmBatchLog}
                style={styles.batchConfirmBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={13} color="#FFFFFF" />
                <Text style={styles.batchConfirmText}>
                  CONFIRM S{batchSeasonNumber}:E{batchEpisodeNumber < 10 ? `0${batchEpisodeNumber}` : batchEpisodeNumber}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.void,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  backdropContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 360 : 260,
    position: 'relative',
    backgroundColor: '#050507',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  topBackdropGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  backdropGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? ('max(env(safe-area-inset-top, 0px), 12px)' as any) : 8,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  navIconButton: {
    width: 38,
    height: 38,
    borderRadius: 3,
    backgroundColor: 'rgba(5, 5, 7, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  navIconButtonActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(235, 0, 41, 0.15)',
  },
  navRightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroSection: {
    paddingHorizontal: 16,
    marginTop: -38,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  posterAndMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  heroPoster: {
    width: 108,
    height: 162,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  heroMetaDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'flex-end',
  },
  formatTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  formatTag: {
    backgroundColor: 'rgba(235, 0, 41, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(235, 0, 41, 0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  formatTagText: {
    fontFamily: typography.fontBlack,
    fontSize: 8.5,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  releaseYearText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
  },
  specsInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  specsRuntime: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imdbBadge: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  ratingBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.4 : 0,
  },
  ratingBadgeLabel: {
    fontFamily: typography.fontSemiBold,
    fontSize: 8,
    color: colors.textMuted,
    marginLeft: 3,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  genreTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreTagText: {
    fontFamily: typography.fontSemiBold,
    color: colors.textMuted,
    fontSize: 8.5,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
  actionHubCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statusSegmentContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#09090C',
  },
  statusSegmentBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statusSegmentBtnActive: {
    backgroundColor: colors.surfaceElevated,
  },
  statusSegmentText: {
    fontFamily: typography.fontBold,
    color: colors.textMuted,
    fontSize: 9.5,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  statusSegmentTextActive: {
    color: colors.textPrimary,
  },
  statusActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
  },
  actionBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingInfo: {
    justifyContent: 'center',
  },
  ratingLabel: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    marginBottom: 2,
    includeFontPadding: false,
  },
  ratingValueText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
  },
  actionPillsRow: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 7,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  actionPillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(235, 0, 41, 0.1)',
  },
  actionPillText: {
    fontFamily: typography.fontBold,
    color: colors.textSecondary,
    fontSize: 8.5,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  seriesTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  seriesTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seriesTabItemActive: {
    // Active styling handled by text and underline
  },
  seriesTabWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seriesTabText: {
    fontFamily: typography.fontBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  seriesTabTextActive: {
    color: colors.textPrimary,
  },
  tabBadge: {
    backgroundColor: 'rgba(235, 0, 41, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(235, 0, 41, 0.3)',
  },
  tabBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.accent,
  },
  seriesTabLine: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: colors.accent,
  },
  episodesTabContent: {
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  progressStats: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 10,
  },
  fullProgressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  fullProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  nextUpCard: {
    backgroundColor: '#0F0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 42, 0.25)',
    borderRadius: 3,
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextUpThumbContainer: {
    width: 66,
    height: 42,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(235, 0, 41, 0.35)',
    marginRight: 10,
    backgroundColor: colors.surfaceElevated,
  },
  nextUpThumbImage: {
    width: '100%',
    height: '100%',
  },
  nextUpLeft: {
    flex: 1,
    paddingRight: 8,
  },
  nextUpTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    marginBottom: 3,
  },
  nextUpTagText: {
    color: colors.accent,
    fontSize: 7.5,
    fontWeight: '900',
    fontFamily: typography.fontBlack,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  nextUpTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fontBold,
    marginBottom: 2,
  },
  nextUpMeta: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontFamily: typography.fontMedium,
  },
  nextUpLogBtn: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 2,
    gap: 4,
  },
  nextUpLogBtnText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: typography.fontBlack,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
  upcomingBroadcastCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.35)',
    borderRadius: 2,
    padding: 12,
    marginBottom: 16,
  },
  upcomingBroadcastTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  broadcastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  broadcastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  broadcastLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  broadcastNetworkPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
  },
  broadcastNetworkText: {
    fontFamily: typography.fontBold,
    fontSize: 8,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  broadcastDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  broadcastInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  broadcastEpisodeText: {
    fontFamily: typography.fontBold,
    fontSize: 12.5,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  broadcastDateText: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.textMuted,
  },
  broadcastCountdownPill: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 2,
  },
  broadcastCountdownText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  broadcastRadarLink: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
    alignItems: 'flex-start',
  },
  broadcastRadarLinkText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.accent,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  seasonsScrollRow: {
    gap: 6,
    paddingBottom: 10,
  },
  seasonTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seasonTabActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accent,
  },
  seasonTabText: {
    fontFamily: typography.fontSemiBold,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  seasonTabTextActive: {
    color: colors.textPrimary,
  },
  seasonActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  seasonStatusText: {
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    fontSize: 9.5,
  },
  seasonActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batchLogTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(235, 0, 41, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(235, 0, 41, 0.25)',
  },
  batchLogTriggerText: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 8.5,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  markSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markSeasonBtnClear: {
    opacity: 0.8,
  },
  markSeasonText: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  markSeasonTextClear: {
    color: colors.textMuted,
  },
  sectionContainer: {
    marginBottom: 16,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
    marginBottom: 8,
  },
  providersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  overviewText: {
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: Platform.OS === 'ios' ? 0.1 : 0,
    includeFontPadding: false,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editReviewLink: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  reviewEditBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  reviewInput: {
    fontFamily: typography.fontBody,
    color: colors.textPrimary,
    fontSize: 12,
    height: 70,
    textAlignVertical: 'top',
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  reviewCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  reviewCancelText: {
    fontFamily: typography.fontSemiBold,
    color: colors.textMuted,
    fontSize: 10,
  },
  reviewSaveBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 2,
  },
  reviewSaveText: {
    fontFamily: typography.fontBold,
    color: '#050507',
    fontSize: 10,
  },
  reviewDisplayBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  reviewDisplayText: {
    fontFamily: typography.fontBody,
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyReviewPrompt: {
    fontFamily: typography.fontBody,
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  castHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  castCountBadge: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  castScrollContainer: {
    flexDirection: 'row',
    paddingRight: 16,
    gap: 10,
  },
  castCard: {
    width: 82,
  },
  castPhotoWrapper: {
    width: 82,
    height: 110,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
    marginBottom: 6,
  },
  castPhoto: {
    width: '100%',
    height: '100%',
  },
  castPhotoFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  castInitials: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  actorName: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
    fontSize: 10.5,
    lineHeight: 13,
  },
  characterName: {
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    fontSize: 9.5,
    lineHeight: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontFamily: typography.fontBlack,
    color: colors.textPrimary,
    fontSize: 11,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  modalCloseBtn: {
    padding: 4,
  },
  watchlistSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  watchlistSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watchlistDot: {
    width: 6,
    height: 6,
  },
  watchlistSelectName: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  watchlistStatusBadge: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textMuted,
  },
  watchlistStatusActive: {
    color: colors.accent,
  },
  batchModalCard: {
    width: '100%',
    backgroundColor: '#0A0A0E',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  batchModalOverline: {
    fontFamily: typography.fontBold,
    color: colors.accent,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginBottom: 2,
  },
  batchModalInstructions: {
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
  },
  batchSectionLabel: {
    fontFamily: typography.fontBold,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
    marginBottom: 6,
  },
  batchSeasonScroll: {
    gap: 6,
    marginBottom: 14,
  },
  batchSeasonTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  batchSeasonTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  batchSeasonTabText: {
    fontFamily: typography.fontSemiBold,
    color: colors.textMuted,
    fontSize: 10,
  },
  batchSeasonTabTextActive: {
    color: '#FFFFFF',
    fontFamily: typography.fontBold,
  },
  batchEpisodesScroll: {
    maxHeight: 140,
    marginBottom: 12,
  },
  batchEpisodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 2,
  },
  batchEpisodePill: {
    width: 44,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  batchEpisodePillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  batchEpisodePillText: {
    fontFamily: typography.fontBold,
    color: colors.textSecondary,
    fontSize: 10,
  },
  batchEpisodePillTextActive: {
    color: '#FFFFFF',
  },
  batchSelectionPreview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    borderRadius: 2,
    marginBottom: 14,
  },
  batchSelectionTarget: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
    fontSize: 12,
    marginBottom: 3,
  },
  batchSelectionMeta: {
    fontFamily: typography.fontBody,
    color: colors.textMuted,
    fontSize: 10,
  },
  batchModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  batchCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchCancelText: {
    fontFamily: typography.fontBold,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
  batchConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 2,
    gap: 5,
  },
  batchConfirmText: {
    fontFamily: typography.fontBlack,
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
});
