import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface LegalAboutModalProps {
  visible: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onDeleteAccount: () => void;
  onClearHistory: () => void;
}

export const LegalAboutModal: React.FC<LegalAboutModalProps> = ({
  visible,
  onClose,
  isAuthenticated,
  onDeleteAccount,
  onClearHistory,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const modalWidth = Math.min(windowWidth - 32, 420);
  const maxContentHeight = Math.min(windowHeight * 0.75, 540);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { width: modalWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.statusRow}>
                <View style={styles.accentDot} />
                <Text style={styles.headerIndex}>HOQRUX // ARCHIVE REPORT</Text>
              </View>
              <Text style={styles.headerTitle}>LEGAL & POLICIES</Text>
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

          <ScrollView
            style={{ maxHeight: maxContentHeight }}
            showsVerticalScrollIndicator={false}
          >
            {/* App Meta Section */}
            <View style={styles.aboutCard}>
              <Text style={styles.cardHeading}>ARCHITECTURE</Text>
              <Text style={styles.cardDesc}>
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
                <Text style={styles.metaValue}>
                  {isAuthenticated ? 'SUPABASE CLOUD + LOCAL' : 'OFFLINE LOCAL-FIRST'}
                </Text>
              </View>
            </View>

            {/* TMDb Attribution Section */}
            <View style={styles.aboutCard}>
              <View style={styles.tmdbHeaderRow}>
                <Text style={styles.cardHeading}>DATA SOURCES & ATTRIBUTION</Text>
                <View style={styles.tmdbBadge}>
                  <Text style={styles.tmdbBadgeText}>TMDB API</Text>
                </View>
              </View>
              <Text style={styles.tmdbDisclaimerText}>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </Text>
              <Text style={styles.cardDesc}>
                Film, television, streaming availability, and anime catalog records are supplied by The Movie Database (TMDb), AniList, and TVmaze.
              </Text>
            </View>

            {/* Legal & Privacy Policy Links */}
            <View style={styles.aboutCard}>
              <Text style={styles.cardHeading}>POLICIES & DATA GOVERNANCE</Text>
              <TouchableOpacity
                style={styles.legalLinkRow}
                onPress={() => Linking.openURL('https://github.com/HarshitFreq/HOQRUX/blob/main/docs/PRIVACY_POLICY.md')}
                activeOpacity={0.7}
              >
                <View style={styles.legalLinkLeft}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.textPrimary} style={{ marginRight: 8 }} />
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
                  <Ionicons name="trash-bin-outline" size={14} color={colors.textPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.legalLinkText}>Account & Data Deletion</Text>
                </View>
                <Ionicons name="open-outline" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Danger Zone: Data Purge */}
            <View style={styles.dangerZoneCard}>
              <Text style={styles.dangerZoneTitle}>DATA PURGE // DANGER ZONE</Text>
              <Text style={styles.dangerZoneDesc}>
                Permanently purge all user records, lists, ratings, and viewing history. This action cannot be reversed.
              </Text>

              {isAuthenticated ? (
                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={onDeleteAccount}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.deleteAccountBtnText}>DELETE ACCOUNT & PURGE ALL DATA</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.deleteAccountBtn}
                  onPress={onClearHistory}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.deleteAccountBtnText}>PURGE ALL LOCAL DEVICE DATA</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
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
  aboutCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 14,
    marginBottom: 12,
  },
  cardHeading: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 1.2,
    includeFontPadding: false,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaLabel: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  metaValue: {
    fontFamily: typography.fontMedium,
    fontSize: 9.5,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  tmdbHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tmdbBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  tmdbBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.accent,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  tmdbDisclaimerText: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginBottom: 6,
  },
  legalLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legalLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLinkText: {
    fontFamily: typography.fontMedium,
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  dangerZoneCard: {
    backgroundColor: 'rgba(229, 9, 20, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.35)',
    borderRadius: 2,
    padding: 14,
    marginBottom: 4,
  },
  dangerZoneTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
    includeFontPadding: false,
    marginBottom: 6,
  },
  dangerZoneDesc: {
    fontFamily: typography.fontBody,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
    marginBottom: 12,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 8,
    borderRadius: 2,
  },
  deleteAccountBtnText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
});
