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
    isCloudConnected,
    cloudSyncStatus,
    savedAccounts,
    signIn,
    signUp,
    signOut,
    switchAccount,
    connectSupabase,
    disconnectSupabase,
    triggerSync,
  } = useAuth();

  const { tracking, stats, watchlists, refreshTracking } = useTracking();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cloud config accordion
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);

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
      resetForm();
      onClose();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(res.error || 'Sign in failed');
    }
  };

  const handleSignUp = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
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
      resetForm();
      onClose();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(res.error || 'Sign up failed');
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string, demoName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSubmitting(true);
    setErrorMsg(null);
    // Try sign in, if not found auto-create
    const res = await signIn(demoEmail, demoPass);
    if (!res.success) {
      await signUp(demoEmail, demoPass, demoName);
    }
    setIsSubmitting(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleSignOut = () => {
    Alert.alert(
      'LOG OUT',
      'Your tracking and logs will remain safely saved in your account. You can log back in anytime to restore them.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'LOG OUT',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await signOut();
            onClose();
          },
        },
      ]
    );
  };

  const handleSwitch = async (targetId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await switchAccount(targetId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleConnectCloud = async () => {
    if (!supabaseUrl || !supabaseKey) {
      Alert.alert('CONFIG ERROR', 'Please enter both Supabase URL and Anon Key.');
      return;
    }
    setIsConnectingCloud(true);
    const ok = await connectSupabase(supabaseUrl, supabaseKey);
    setIsConnectingCloud(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('CONNECTED', 'Successfully connected to Supabase PostgreSQL database.');
      setShowCloudConfig(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('CONNECTION FAILED', 'Could not initialize Supabase with the provided credentials.');
    }
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
              <Text style={styles.headerTitle}>USER DATABASE</Text>
              <Text style={styles.headerSubtitle}>
                {isAuthenticated ? 'ACCOUNT SECURED & LOGGED' : 'SIGN IN TO PERSIST LOGS'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* If Logged In View */}
            {isAuthenticated ? (
              <View style={styles.authenticatedBox}>
                {/* User Card */}
                <View style={styles.userCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(user.username || user.email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.username || 'USER'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              cloudSyncStatus === 'synced'
                                ? COLOR_EMERALD
                                : cloudSyncStatus === 'syncing'
                                ? colors.accent
                                : colors.textMuted,
                          },
                        ]}
                      />
                      <Text style={styles.badgeText}>
                        {isCloudConnected
                          ? `SUPABASE CLOUD (${cloudSyncStatus.toUpperCase()})`
                          : 'LOCAL DATABASE (ACCOUNT PERSISTED)'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Account Metrics Bar */}
                <View style={styles.metricsBar}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {Object.keys(tracking || {}).length}
                    </Text>
                    <Text style={styles.metricLbl}>TRACKED</Text>
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
                    <Text style={styles.metricLbl}>LOGGED</Text>
                  </View>
                </View>

                {/* Cloud Sync Action */}
                {isCloudConnected && (
                  <TouchableOpacity
                    style={[styles.syncBtn, isSyncing && { opacity: 0.6 }]}
                    disabled={isSyncing}
                    onPress={async () => {
                      setIsSyncing(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const res = await triggerSync();
                      await refreshTracking();
                      setIsSyncing(false);
                      if (res.success) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('CLOUD SYNC COMPLETE', res.message);
                      } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        Alert.alert('SYNC FAILED', res.message);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.syncBtnText}>
                      {isSyncing ? 'SYNCING WITH SUPABASE...' : 'FORCE CLOUD SYNC NOW'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Account Switcher List */}
                {savedAccounts.length > 1 && (
                  <View style={styles.switchSection}>
                    <Text style={styles.sectionLabel}>SWITCH ACCOUNTS ON DEVICE</Text>
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

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={14} color={COLOR_CARDINAL} style={{ marginRight: 6 }} />
                  <Text style={styles.logoutBtnText}>LOG OUT OF ACCOUNT</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* If Logged Out / Guest View */
              <View style={styles.unauthBox}>
                {/* Segment tabs */}
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

                {/* Form Inputs */}
                {activeTab === 'signup' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>USERNAME</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. MOVIEBUFF"
                      placeholderTextColor={colors.textMuted}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="characters"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="user@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                {/* Submit button */}
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
                      {activeTab === 'signin' ? 'SIGN IN TO HOQRUX' : 'CREATE ACCOUNT & SYNC'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Quick 1-Tap Demo Accounts */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoSectionTitle}>QUICK ACCOUNT TESTING</Text>
                  <Text style={styles.demoSectionDesc}>
                    Tap to instantly test user database isolation and multi-account logging:
                  </Text>
                  <View style={styles.demoButtonsRow}>
                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleQuickLogin('alice@hoqrux.app', 'hoqrux123', 'ALICE')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.demoBtnText}>USER 1: ALICE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.demoBtn}
                      onPress={() => handleQuickLogin('bob@hoqrux.app', 'hoqrux123', 'BOB')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.demoBtnText}>USER 2: BOB</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Cloud Database (Supabase) Setup Section */}
            <View style={styles.cloudConfigContainer}>
              <TouchableOpacity
                style={styles.cloudConfigHeader}
                onPress={() => setShowCloudConfig(!showCloudConfig)}
                activeOpacity={0.7}
              >
                <View style={styles.cloudConfigHeaderLeft}>
                  <Ionicons name="server-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.cloudConfigHeaderText}>SUPABASE POSTGRESQL SETTINGS</Text>
                </View>
                <Ionicons
                  name={showCloudConfig ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {showCloudConfig && (
                <View style={styles.cloudConfigBody}>
                  <Text style={styles.cloudConfigNotice}>
                    Connect your own Supabase project URL and anon public key for cross-device cloud sync:
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SUPABASE URL</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="https://xyz.supabase.co"
                      placeholderTextColor={colors.textMuted}
                      value={supabaseUrl}
                      onChangeText={setSupabaseUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SUPABASE ANON KEY</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                      placeholderTextColor={colors.textMuted}
                      value={supabaseKey}
                      onChangeText={setSupabaseKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.cloudBtnRow}>
                    <TouchableOpacity
                      style={styles.cloudSaveBtn}
                      onPress={handleConnectCloud}
                      activeOpacity={0.7}
                      disabled={isConnectingCloud}
                    >
                      {isConnectingCloud ? (
                        <ActivityIndicator size="small" color={colors.void} />
                      ) : (
                        <Text style={styles.cloudSaveBtnText}>SAVE & CONNECT CLOUD</Text>
                      )}
                    </TouchableOpacity>
                    {isCloudConnected && (
                      <TouchableOpacity
                        style={styles.cloudDisconnectBtn}
                        onPress={async () => {
                          await disconnectSupabase();
                          Alert.alert('DISCONNECTED', 'Switched back to local-first database mode.');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cloudDisconnectBtnText}>DISCONNECT</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A10',
    borderTopWidth: 1,
    borderColor: '#262630',
    maxHeight: '88%',
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
    borderColor: '#181822',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontBlack,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.fontBody,
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#262630',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  authenticatedBox: {
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#262630',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: '#1E1E2A',
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
    fontSize: 14,
    letterSpacing: 0.5,
  },
  userEmail: {
    color: colors.textSecondary,
    fontFamily: typography.fontBody,
    fontSize: 11,
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
    letterSpacing: 0.8,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#262630',
    paddingVertical: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    color: colors.textPrimary,
    fontFamily: typography.fontBlack,
    fontSize: 16,
  },
  metricLbl: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#262630',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12121C',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 12,
  },
  syncBtnText: {
    color: colors.accent,
    fontFamily: typography.fontBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  switchSection: {
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#262630',
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
    borderBottomWidth: 1,
    borderColor: '#181822',
  },
  accountRowActive: {
    opacity: 0.9,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountRowName: {
    color: colors.textSecondary,
    fontFamily: typography.fontMedium,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#140A0D',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 12,
    marginTop: 4,
  },
  logoutBtnText: {
    color: COLOR_CARDINAL,
    fontFamily: typography.fontBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  unauthBox: {
    gap: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#12121A',
    borderWidth: 1,
    borderColor: '#262630',
    marginBottom: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: colors.textPrimary,
  },
  segmentTabText: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  segmentTabTextActive: {
    color: colors.void,
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
    fontFamily: typography.fontMedium,
    fontSize: 11,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textMuted,
    fontFamily: typography.fontBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#262630',
    color: colors.textPrimary,
    fontFamily: typography.fontMedium,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  submitBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.void,
    fontFamily: typography.fontBlack,
    fontSize: 11,
    letterSpacing: 1,
  },
  demoSection: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#262630',
  },
  demoSectionTitle: {
    color: colors.accent,
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  demoSectionDesc: {
    color: colors.textMuted,
    fontFamily: typography.fontBody,
    fontSize: 10,
    marginTop: 3,
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#2E2E40',
    paddingVertical: 9,
    alignItems: 'center',
  },
  demoBtnText: {
    color: colors.textPrimary,
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  cloudConfigContainer: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#0E0E14',
    borderWidth: 1,
    borderColor: '#262630',
  },
  cloudConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  cloudConfigHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cloudConfigHeaderText: {
    color: colors.textSecondary,
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  cloudConfigBody: {
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#1E1E28',
    gap: 12,
  },
  cloudConfigNotice: {
    color: colors.textMuted,
    fontFamily: typography.fontBody,
    fontSize: 10,
    lineHeight: 14,
  },
  cloudBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cloudSaveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudSaveBtnText: {
    color: colors.void,
    fontFamily: typography.fontBlack,
    fontSize: 10,
    letterSpacing: 1,
  },
  cloudDisconnectBtn: {
    paddingHorizontal: 12,
    backgroundColor: '#1E1E28',
    borderWidth: 1,
    borderColor: '#3A3A4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudDisconnectBtnText: {
    color: COLOR_CARDINAL,
    fontFamily: typography.fontBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});

export default AccountModal;
