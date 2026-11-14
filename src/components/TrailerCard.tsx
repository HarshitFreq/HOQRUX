import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MediaItem } from '../services/types';
import { trailerService } from '../services/trailerService';

interface TrailerCardProps {
  mediaItem: MediaItem;
  style?: any;
}

export const TrailerCard: React.FC<TrailerCardProps> = ({ mediaItem, style }) => {
  const trailerKey = mediaItem.trailerKey;
  const thumbnailUrl = trailerKey
    ? `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`
    : mediaItem.backdropPath || mediaItem.posterPath;

  const handlePress = () => {
    trailerService.openTrailer(mediaItem);
  };

  return (
    <View style={[styles.sectionContainer, style]}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="logo-youtube" size={14} color="#FF0000" style={styles.headerIcon} />
          <Text style={styles.sectionHeaderTitle}>OFFICIAL TRAILER</Text>
        </View>
        <View style={styles.headerTag}>
          <Text style={styles.headerTagText}>YOUTUBE</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cardContainer}
        onPress={handlePress}
        activeOpacity={0.88}
      >
        <View style={styles.thumbnailWrapper}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['transparent', 'rgba(5, 5, 7, 0.75)', 'rgba(5, 5, 7, 0.95)']}
            locations={[0, 0.5, 1]}
            style={styles.gradientOverlay}
          />

          {/* Central Play Badge */}
          <View style={styles.playBadge}>
            <View style={styles.playIconCircle}>
              <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>

          {/* Bottom Meta */}
          <View style={styles.bottomMeta}>
            <Text style={styles.overline}>WATCH ON YOUTUBE</Text>
            <Text style={styles.trailerTitle} numberOfLines={1}>
              {mediaItem.title} — Official Trailer
            </Text>
            <View style={styles.externalRow}>
              <Ionicons name="open-outline" size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.externalNotice}>Opens external YouTube application</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
  cardContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  thumbnailWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
  },
  playBadge: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomMeta: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
  },
  overline: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    color: colors.accent,
    marginBottom: 2,
  },
  trailerTitle: {
    fontFamily: typography.fontBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    marginBottom: 4,
  },
  externalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  externalNotice: {
    fontFamily: typography.fontBody,
    fontSize: 10,
    color: colors.textSecondary,
  },
});
