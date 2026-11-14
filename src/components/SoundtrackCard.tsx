import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MediaItem, SoundtrackInfo } from '../services/types';
import { soundtrackService } from '../services/soundtrackService';

interface SoundtrackCardProps {
  mediaItem: MediaItem;
  initialSoundtrack?: SoundtrackInfo;
  style?: any;
}

export const SoundtrackCard: React.FC<SoundtrackCardProps> = ({
  mediaItem,
  initialSoundtrack,
  style,
}) => {
  const resolvedPropSoundtrack = initialSoundtrack || mediaItem.soundtrack || null;
  const [asyncSoundtrack, setAsyncSoundtrack] = useState<SoundtrackInfo | null>(null);
  const [isLoading, setIsLoading] = useState(!resolvedPropSoundtrack);

  const soundtrack = resolvedPropSoundtrack || asyncSoundtrack;

  useEffect(() => {
    let isMounted = true;
    if (resolvedPropSoundtrack) {
      return;
    }

    async function loadSoundtrack() {
      setIsLoading(true);
      try {
        const resolved = await soundtrackService.resolveSoundtrack(mediaItem);
        if (isMounted) {
          setAsyncSoundtrack(resolved);
        }
      } catch (err) {
        console.warn('Failed to resolve soundtrack:', err);
        if (isMounted) {
          setAsyncSoundtrack({
            albumName: 'Soundtrack Not Available',
            isAvailable: false,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSoundtrack();

    return () => {
      isMounted = false;
    };
  }, [mediaItem, resolvedPropSoundtrack]);

  if (isLoading) {
    return (
      <View style={[styles.sectionContainer, style]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>OFFICIAL SOUNDTRACK</Text>
          <View style={styles.headerTag}>
            <Text style={styles.headerTagText}>SPOTIFY</Text>
          </View>
        </View>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>CHECKING SPOTIFY AVAILABILITY...</Text>
        </View>
      </View>
    );
  }

  // If soundtrack is unavailable or not found, explicitly display "Not Available"
  // Do NOT hide the section, and NEVER show a wrong album or wrong playlist!
  const isAvailable = Boolean(soundtrack && soundtrack.isAvailable && soundtrack.spotifyUrl);

  if (!isAvailable) {
    return (
      <View style={[styles.sectionContainer, style]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerLeft}>
            <Ionicons name="musical-notes-sharp" size={13} color={colors.textMuted} style={styles.headerIcon} />
            <Text style={styles.sectionHeaderTitle}>OFFICIAL SOUNDTRACK</Text>
          </View>
          <View style={[styles.headerTag, styles.unavailableTag]}>
            <Text style={styles.unavailableTagText}>NOT AVAILABLE</Text>
          </View>
        </View>

        <View style={[styles.cardContainer, styles.unavailableCard]}>
          <View style={styles.metaRow}>
            {/* Architectural Muted Vinyl Disc Placeholder */}
            <View style={[styles.artworkWrapper, styles.unavailableArtwork]}>
              <Ionicons name="disc-outline" size={40} color={colors.textMuted} />
            </View>

            {/* Unavailable Info */}
            <View style={styles.infoWrapper}>
              <Text style={styles.unavailableOverline}>SPOTIFY AVAILABILITY</Text>
              <Text style={styles.unavailableTitle}>Not Available</Text>
              <Text style={styles.unavailableSubtext}>
                No verified official soundtrack album found on Spotify for this{' '}
                {mediaItem.type === 'tv' || mediaItem.type === 'anime' ? 'series' : 'title'}.
              </Text>
            </View>
          </View>

          {/* Disabled Brutalist Status Bar */}
          <View style={styles.unavailableButton}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.unavailableButtonText}>NOT AVAILABLE ON SPOTIFY</Text>
          </View>
        </View>
      </View>
    );
  }

  // Safe to assert soundtrack is non-null here due to isAvailable check
  const activeSoundtrack = soundtrack!;
  const displayArt = activeSoundtrack.artworkUrl || mediaItem.backdropPath || mediaItem.posterPath;
  const composerName = activeSoundtrack.composer || mediaItem.composer || 'Original Score';

  return (
    <View style={[styles.sectionContainer, style]}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="musical-notes-sharp" size={13} color={colors.accent} style={styles.headerIcon} />
          <Text style={styles.sectionHeaderTitle}>OFFICIAL SOUNDTRACK</Text>
        </View>
        <View style={styles.headerTag}>
          <Text style={styles.headerTagText}>
            {activeSoundtrack.trackCount ? `${activeSoundtrack.trackCount} TRACKS` : 'VERIFIED SCORE'}
          </Text>
        </View>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.metaRow}>
          {/* Vinyl / CD Artwork Cover */}
          <View style={styles.artworkWrapper}>
            <Image
              source={{ uri: displayArt }}
              style={styles.artworkImage}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
            {/* Vinyl record groove effect behind cover */}
            <View style={styles.vinylGroove} />
          </View>

          {/* Soundtrack Details */}
          <View style={styles.infoWrapper}>
            <Text style={styles.overline}>
              {mediaItem.type === 'tv' || mediaItem.type === 'anime'
                ? 'ORIGINAL SERIES SCORE'
                : 'ORIGINAL MOTION PICTURE SOUNDTRACK'}
            </Text>
            <Text style={styles.albumTitle} numberOfLines={2}>
              {activeSoundtrack.albumName}
            </Text>
            <Text style={styles.composerName} numberOfLines={1}>
              COMPOSED BY {composerName.toUpperCase()}
            </Text>
            <Text style={styles.specsText}>
              {activeSoundtrack.releaseYear || mediaItem.releaseYear} • HIGH FIDELITY AUDIO
            </Text>
          </View>
        </View>

        {/* High-Contrast Spotify Action Button */}
        <TouchableOpacity
          style={styles.spotifyButton}
          onPress={() => soundtrackService.openSpotify(activeSoundtrack)}
          activeOpacity={0.82}
        >
          <View style={styles.spotifyBtnLeft}>
            <FontAwesome5 name="spotify" size={18} color="#000000" />
            <Text style={styles.spotifyBtnText}>LISTEN ON SPOTIFY</Text>
          </View>
          <View style={styles.spotifyBtnArrow}>
            <Ionicons name="arrow-forward-sharp" size={15} color="#000000" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 0,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  sectionHeaderTitle: {
    fontFamily: typography.fontBold,
    fontSize: 12,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    color: colors.textPrimary,
  },
  headerTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTagText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
  },
  unavailableTag: {
    borderColor: 'rgba(235, 0, 41, 0.4)',
    backgroundColor: 'rgba(235, 0, 41, 0.08)',
  },
  unavailableTagText: {
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 14,
  },
  unavailableCard: {
    borderColor: colors.borderHairline,
    backgroundColor: 'rgba(16, 16, 20, 0.6)',
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  artworkWrapper: {
    width: 78,
    height: 78,
    position: 'relative',
    marginRight: 16,
  },
  unavailableArtwork: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: 74,
    height: 74,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    zIndex: 2,
  },
  vinylGroove: {
    position: 'absolute',
    top: 2,
    right: -4,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0A0A0E',
    borderWidth: 1.5,
    borderColor: colors.borderHairline,
    zIndex: 1,
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  overline: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  albumTitle: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  composerName: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    color: colors.accent,
    marginBottom: 3,
  },
  specsText: {
    fontFamily: typography.fontBody,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    color: colors.textMuted,
  },
  unavailableOverline: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    color: colors.textMuted,
    marginBottom: 2,
  },
  unavailableTitle: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  unavailableSubtext: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  unavailableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    paddingVertical: 11,
    paddingHorizontal: 14,
    opacity: 0.75,
  },
  unavailableButtonText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    color: colors.textSecondary,
  },
  spotifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1DB954',
    borderRadius: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  spotifyBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotifyBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 12,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    color: '#000000',
    marginLeft: 10,
  },
  spotifyBtnArrow: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
