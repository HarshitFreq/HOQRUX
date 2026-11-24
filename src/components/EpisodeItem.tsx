import React, { useState, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../utils/feedback';
import { Episode, MediaItem } from '../services/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTracking } from '../context/TrackingContext';

interface EpisodeItemProps {
  episode: Episode;
  mediaItem: MediaItem;
}

export const EpisodeItem: React.FC<EpisodeItemProps> = memo(({ episode, mediaItem }) => {
  const { getEpisodeProgress, toggleEpisodeWatched, markEpisodesUpTo } = useTracking();
  const [expanded, setExpanded] = useState(false);

  const isWatched = getEpisodeProgress(
    mediaItem.id,
    episode.seasonNumber,
    episode.episodeNumber
  );

  const handleToggle = useCallback(() => {
    if (!isWatched) {
      feedback.success();
    } else {
      feedback.toggle();
    }
    toggleEpisodeWatched(
      mediaItem,
      episode.seasonNumber,
      episode.episodeNumber,
      episode.title,
      episode.runtime
    );
  }, [isWatched, mediaItem, episode, toggleEpisodeWatched]);

  const epNumStr = episode.episodeNumber < 10 ? `0${episode.episodeNumber}` : `${episode.episodeNumber}`;

  const handleLongPress = useCallback(() => {
    feedback.warning();
    Alert.alert(
      'Batch Log Episodes',
      `Mark all episodes up to Season ${episode.seasonNumber}, Episode ${epNumStr} as watched?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Watched Up To Here',
          onPress: () => {
            feedback.success();
            markEpisodesUpTo(mediaItem, episode.seasonNumber, episode.episodeNumber, true);
          },
        },
      ]
    );
  }, [epNumStr, markEpisodesUpTo, mediaItem, episode]);

  const thumbUri = episode.stillPath || mediaItem.backdropPath || mediaItem.posterPath;

  return (
    <View style={[styles.container, isWatched && styles.containerWatched]}>
      {/* Episode Thumbnail */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.thumbnailWrapper}
      >
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="film-outline" size={14} color={colors.textMuted} />
          </View>
        )}
        {isWatched && (
          <View style={styles.thumbnailWatchedOverlay}>
            <View style={styles.thumbnailWatchedBadge}>
              <Ionicons name="checkmark-sharp" size={10} color="#FFFFFF" />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Episode Details (Tap to expand, Long press for batch log up to here) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        onLongPress={handleLongPress}
        delayLongPress={450}
        style={styles.content}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.episodeIndex, isWatched && styles.episodeIndexWatched]}>
            E{epNumStr}
          </Text>
          <Text style={styles.slash}>/</Text>
          <Text style={styles.runtime}>{episode.runtime || 45}M</Text>
          {episode.airDate ? (
            <>
              <Text style={styles.slash}>/</Text>
              <Text style={styles.airDate}>{episode.airDate}</Text>
            </>
          ) : null}
        </View>

        <Text
          style={[styles.title, isWatched && styles.titleWatched]}
          numberOfLines={expanded ? undefined : 1}
        >
          {episode.title}
        </Text>

        {episode.overview ? (
          <Text
            style={styles.overview}
            numberOfLines={expanded ? undefined : 2}
          >
            {episode.overview}
          </Text>
        ) : null}

        {expanded && (
          <View style={styles.expandedFooter}>
            <TouchableOpacity
              style={styles.batchLogBtn}
              onPress={() => {
                feedback.success();
                markEpisodesUpTo(mediaItem, episode.seasonNumber, episode.episodeNumber, true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="play-forward-sharp" size={11} color={colors.accent} />
              <Text style={styles.batchLogBtnText}>
                WATCHED UP TO HERE (S{episode.seasonNumber}:E{epNumStr})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Right Quick Action Button (LOG / DONE) */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleToggle}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
        style={[styles.actionBtn, isWatched ? styles.actionBtnDone : styles.actionBtnLog]}
      >
        <Ionicons
          name={isWatched ? 'checkmark-sharp' : 'checkmark-outline'}
          size={12}
          color={isWatched ? '#FFFFFF' : colors.textSecondary}
        />
        <Text style={[styles.actionBtnText, isWatched ? styles.actionTextDone : styles.actionTextLog]}>
          {isWatched ? 'DONE' : 'LOG'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

EpisodeItem.displayName = 'EpisodeItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 3,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerWatched: {
    backgroundColor: '#0C0C10',
    borderColor: colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  thumbnailWrapper: {
    width: 82,
    height: 48,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  thumbnailWatchedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 7, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailWatchedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  checkboxInnerHollow: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  checkboxWatched: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  episodeIndex: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.fontBold,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    includeFontPadding: false,
  },
  episodeIndexWatched: {
    color: colors.textSecondary,
  },
  slash: {
    color: colors.textMuted,
    marginHorizontal: 4,
    fontSize: 9,
  },
  runtime: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: typography.fontMedium,
  },
  airDate: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: typography.fontBody,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontBold,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  titleWatched: {
    color: colors.textSecondary,
  },
  overview: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: typography.fontBody,
    lineHeight: 15,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 2,
    borderWidth: 1,
  },
  actionBtnLog: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: colors.borderLight,
  },
  actionBtnDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionBtnText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: typography.fontBold,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
    marginLeft: 3,
  },
  actionTextLog: {
    color: colors.textSecondary,
  },
  actionTextDone: {
    color: '#FFFFFF',
  },
  expandedFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  batchLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(235, 0, 41, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(235, 0, 41, 0.3)',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
  },
  batchLogBtnText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    fontFamily: typography.fontBold,
    letterSpacing: Platform.OS === 'ios' ? 0.6 : 0,
    includeFontPadding: false,
  },
});
