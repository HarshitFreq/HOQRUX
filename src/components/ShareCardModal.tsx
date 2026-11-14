import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem, UserTitleTracking } from '../services/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { RatingStars } from './RatingStars';

interface ShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  mediaItem: MediaItem;
  tracking?: UserTitleTracking;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  visible,
  onClose,
  mediaItem,
  tracking,
}) => {
  const handleShare = async () => {
    try {
      const ratingText = tracking?.rating ? ` rated it ${tracking.rating}/5.0` : '';
      const message = `HOQRUX // ARCHIVE REPORT\n"${mediaItem.title}" (${mediaItem.releaseYear})${ratingText}\nLogged in HOQRUX.`;
      
      await Share.share({
        message,
        title: `${mediaItem.title} // HOQRUX`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIndex}>00 // EXPORT</Text>
              <Text style={styles.headerTitle}>CHRONICLE SHARE CARD</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Swiss Style Export Card */}
          <View style={styles.cardPreview}>
            <View style={styles.cardHeader}>
              <View style={styles.brandRow}>
                <View style={styles.accentSquare} />
                <Text style={styles.brandTitle}>HOQRUX</Text>
              </View>
              <Text style={styles.brandSubtitle}>
                SPEC // {mediaItem.id.slice(-6).toUpperCase()}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <Image
                source={{ uri: mediaItem.posterPath }}
                style={styles.cardPoster}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
              <View style={styles.cardInfo}>
                <Text style={styles.titleText} numberOfLines={2}>
                  {mediaItem.title.toUpperCase()}
                </Text>
                <Text style={styles.yearText}>
                  {mediaItem.releaseYear} • {mediaItem.type === 'tv' ? 'SERIES' : 'FEATURE FILM'}
                </Text>

                {tracking?.rating ? (
                  <View style={styles.ratingSection}>
                    <RatingStars rating={tracking.rating} size={14} showNumeric />
                  </View>
                ) : (
                  <View style={styles.ratingSection}>
                    <RatingStars rating={mediaItem.tmdbRating / 2} size={12} />
                    <Text style={styles.tmdbScore}>
                      ★ {mediaItem.tmdbRating.toFixed(1)} TMDB
                    </Text>
                  </View>
                )}

                {tracking?.review ? (
                  <View style={styles.quoteBox}>
                    <Text style={styles.quoteText} numberOfLines={3}>
                      “{tracking.review}”
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.synopsisText} numberOfLines={3}>
                    {mediaItem.overview}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerStatus}>
                {tracking?.status === 'completed'
                  ? 'STATUS: COMPLETED'
                  : tracking?.status === 'watching'
                  ? 'STATUS: IN PROGRESS'
                  : 'STATUS: WANT TO WATCH'}
              </Text>
              <Text style={styles.footerDate}>
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShare}
            style={styles.shareButton}
          >
            <Ionicons name="share-outline" size={16} color="#050507" />
            <Text style={styles.shareButtonText}>TRANSMIT CARD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 2,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerIndex: {
    fontFamily: typography.fontBlack,
    fontSize: 8,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  headerTitle: {
    fontFamily: typography.fontBlack,
    color: colors.textPrimary,
    fontSize: 11,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  closeBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
  },
  cardPreview: {
    backgroundColor: colors.void,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accentSquare: {
    width: 6,
    height: 6,
    backgroundColor: colors.accent,
  },
  brandTitle: {
    fontFamily: typography.fontBrand,
    color: colors.accent,
    fontSize: 13,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  brandSubtitle: {
    fontFamily: typography.fontSemiBold,
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  cardBody: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardPoster: {
    width: 80,
    height: 120,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: typography.fontBlack,
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: -0.2,
    includeFontPadding: false,
    lineHeight: 16,
    marginBottom: 3,
  },
  yearText: {
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
    marginBottom: 6,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tmdbScore: {
    fontFamily: typography.fontBlack,
    color: colors.starYellow,
    fontSize: 9,
    marginLeft: 6,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  quoteBox: {
    backgroundColor: colors.surfaceElevated,
    padding: 8,
    borderRadius: 2,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  quoteText: {
    fontFamily: typography.fontBody,
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
  },
  synopsisText: {
    fontFamily: typography.fontBody,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerStatus: {
    fontFamily: typography.fontBlack,
    color: colors.accent,
    fontSize: 8,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  footerDate: {
    fontFamily: typography.fontMedium,
    color: colors.textMuted,
    fontSize: 8,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  shareButton: {
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 2,
    gap: 8,
  },
  shareButtonText: {
    fontFamily: typography.fontBlack,
    color: '#050507',
    fontSize: 11,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
});
