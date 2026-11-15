import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';

const COLOR_EMERALD = '#10B981';
const COLOR_CARDINAL = '#EF4444';

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ visible, onClose }) => {
  const {
    user,
    isAuthenticated,
    savedAccounts,
    signIn,
    signUp,
    signOut,
    switchAccount,
  } = useAuth();

  const { tracking, stats, watchlists, refreshTracking } = useTracking();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
    setErrorMsg(null);
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await signIn(email, password);
    setIsSubmitting(false);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshTracking();
      resetForm();
      onClose();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(res.error || 'Sign in failed. Check your credentials.');
    }
  };

  const handleSignUp = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await signUp(email, password, username);
    setIsSubmitting(false);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshTracking();
      resetForm();
      onClose();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(res.error || 'Unable to create account.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'SIGN OUT',
      'Your watchlists and viewing history remain safely backed up in your account. You can sign back in anytime to restore them.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'SIGN OUT',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await signOut();
            await refreshTracking();
            onClose();
          },
        },
      ]
    );
  };

  const handleSwitch = async (targetId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await switchAccount(targetId);
    await refreshTracking();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>HOQRUX ID</Text>
              <Text style={styles.headerSubtitle}>
                {isAuthenticated
                  ? 'PERSONAL LOGBOOK // BACKUP ACTIVE'
                  : 'SIGN IN TO SYNC ACROSS ALL DEVICES'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Authenticated View */}
            {isAuthenticated ? (
              <View style={styles.authenticatedBox}>
                {/* User Profile Card - Pure Typography, No Logo */}
                <View style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.username || 'USER'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                </View>

                {/* Account Metrics Bar */}
                <View style={styles.metricsBar}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {Object.keys(tracking || {}).length}
                    </Text>
                    <Text style={styles.metricLbl}>TITLES</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>{watchlists.length}</Text>
                    <Text style={styles.metricLbl}>LISTS</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {(stats?.totalMoviesWatched ?? 0) + (stats?.totalEpisodesWatched ?? 0)}
                    </Text>
                    <Text style={styles.metricLbl}>LOGS</Text>
                  </View>
                </View>

                {/* Saved Profiles Switcher (If multiple on device) */}
                {savedAccounts.length > 1 && (
                  <View style={styles.switchSection}>
                    <Text style={styles.sectionLabel}>SAVED PROFILES</Text>
                    {savedAccounts.map((acc) => {
                      const isCurrent = acc.id === user.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[styles.accountRow, isCurrent && styles.accountRowActive]}
                          onPress={() => !isCurrent && handleSwitch(acc.id)}
                          activeOpacity={0.7}
                          disabled={isCurrent}
                        >
                          <View style={styles.accountRowLeft}>
                            <Ionicons
                              name={isCurrent ? 'radio-button-on' : 'radio-button-off'}
                              size={14}
                              color={isCurrent ? colors.accent : colors.textMuted}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.accountRowName, isCurrent && styles.accountRowNameActive]}>
                              {acc.username || acc.email}
                            </Text>
                          </View>
                          {isCurrent && <Text style={styles.activeTag}>ACTIVE</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Sign Out Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={15} color={COLOR_CARDINAL} style={{ marginRight: 8 }} />
                  <Text style={styles.logoutBtnText}>SIGN OUT</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Logged Out / Guest View (Sign In & Sign Up) */
              <View style={styles.unauthBox}>
                {/* Segment Tabs */}
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    style={[styles.segmentTab, activeTab === 'signin' && styles.segmentTabActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab('signin');
                      setErrorMsg(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentTabText, activeTab === 'signin' && styles.segmentTabTextActive]}>
                      SIGN IN
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentTab, activeTab === 'signup' && styles.segmentTabActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab('signup');
                      setErrorMsg(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentTabText, activeTab === 'signup' && styles.segmentTabTextActive]}>
                      CREATE ACCOUNT
                    </Text>
                  </TouchableOpacity>
                </View>

                {errorMsg && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={14} color={COLOR_CARDINAL} style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Username Input (Only on Sign Up) */}
                {activeTab === 'signup' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>USERNAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. CINEMABUFF"
                      placeholderTextColor={colors.textMuted}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="characters"
                    />
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@domain.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input with Visibility Toggle */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                  onPress={activeTab === 'signin' ? handleSignIn : handleSignUp}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.void} />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {activeTab === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Feature Highlights Card */}
                <View style={styles.featuresCard}>
                  <Text style={styles.featuresTitle}>HOQRUX LOGBOOK SYNC</Text>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={14} color={COLOR_EMERALD} style={{ marginRight: 8 }} />
                    <Text style={styles.featureText}>Automatic cross-device cloud sync</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={14} color={COLOR_EMERALD} style={{ marginRight: 8 }} />
                    <Text style={styles.featureText}>Safe offline backup for all watchlists</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-sharp" size={14} color={COLOR_EMERALD} style={{ marginRight: 8 }} />
                    <Text style={styles.featureText}>Existing local titles migrate automatically</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#09090E',
    borderTopWidth: 1,
    borderColor: '#22222E',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#181824',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontBlack,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 3,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Authenticated Profile Styles
  authenticatedBox: {
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.accent,
    fontFamily: typography.fontBlack,
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.textPrimary,
    fontFamily: typography.fontBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  userEmail: {
    color: colors.textSecondary,
    fontFamily: typography.fontBody,
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
  },

  // Metrics Bar
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
    paddingVertical: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    color: colors.textPrimary,
    fontFamily: typography.fontBlack,
    fontSize: 18,
  },
  metricLbl: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#22222E',
  },

  // Sync Button
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10101A',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 14,
  },
  syncBtnText: {
    color: colors.accent,
    fontFamily: typography.fontBold,
    fontSize: 12,
    letterSpacing: 1.2,
  },

  // Switch Profiles Section
  switchSection: {
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
    padding: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 8,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#181824',
  },
  accountRowActive: {
    backgroundColor: '#151522',
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountRowName: {
    color: colors.textSecondary,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  accountRowNameActive: {
    color: colors.textPrimary,
    fontFamily: typography.fontBold,
  },
  activeTag: {
    color: colors.accent,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
  },

  // Logout Button
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14080A',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 13,
  },
  logoutBtnText: {
    color: COLOR_CARDINAL,
    fontFamily: typography.fontBold,
    fontSize: 11,
    letterSpacing: 1,
  },

  // Unauthenticated / Login Form Styles
  unauthBox: {
    gap: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentTabActive: {
    backgroundColor: '#151522',
    borderBottomColor: colors.accent,
  },
  segmentTabText: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  segmentTabTextActive: {
    color: colors.textPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: COLOR_CARDINAL,
    padding: 10,
  },
  errorText: {
    color: COLOR_CARDINAL,
    fontFamily: typography.fontBody,
    fontSize: 12,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
    color: colors.textPrimary,
    fontFamily: typography.fontBody,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
  },
  passwordInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.fontBody,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.textPrimary,
    fontFamily: typography.fontBlack,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  featuresCard: {
    backgroundColor: '#0D0D14',
    borderWidth: 1,
    borderColor: '#22222E',
    padding: 14,
    gap: 8,
    marginTop: 6,
  },
  featuresTitle: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    color: colors.textSecondary,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
});
