/**
 * Hoqrux Landing & PWA Installation Guide
 * 
 * Minimalist, cinephile-authored introduction and platform-adaptive installation guide.
 * Pure Swiss typography, zero algorithmic clutter, no AI buzzwords.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { feedback } from '../utils/feedback';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type PlatformTab = 'ios' | 'android' | 'desktop';

function detectUserPlatform(): PlatformTab {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
  }
  return 'desktop';
}

export default function WelcomeScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && windowWidth >= 768;
  const initialPlatform = useMemo(() => detectUserPlatform(), []);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformTab>(initialPlatform);
  const scrollRef = useRef<any>(null);
  const installSectionY = useRef<number>(0);

  const handleLaunchApp = () => {
    feedback.tap();
    router.replace('/(tabs)');
  };

  const scrollToInstall = () => {
    feedback.tap();
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: installSectionY.current - 20, animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={[styles.headerInner, isDesktop && styles.headerInnerDesktop]}>
          <View style={styles.brandGroup}>
            <Text style={styles.brandLogo}>HOQRUX</Text>
            <View style={styles.brandDivider} />
            <Text style={styles.brandSubtitle}>FILM & TV LEDGER</Text>
          </View>

          <TouchableOpacity
            style={styles.launchBtnTop}
            onPress={handleLaunchApp}
            activeOpacity={0.8}
          >
            <Text style={styles.launchBtnTopText}>ENTER APP →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentContainer, isDesktop && styles.contentContainerDesktop]}>
          {/* 2. Hero / Cinephile Manifesto */}
          <View style={styles.heroSection}>
            <View style={styles.leadTag}>
              <View style={styles.redDot} />
              <Text style={styles.leadTagText}>A NOTE ON WHY THIS EXISTS</Text>
            </View>

            <Text style={styles.heroTitle}>Cinema without the noise.</Text>

            <Text style={styles.manifestoParagraph}>
              Most film apps today want you to perform. They push algorithmic feeds, five-star hot takes, endless notifications, and ads for things you will never watch.
            </Text>

            <Text style={styles.manifestoParagraph}>
              We built Hoqrux because we wanted something quieter: a fast, pitch-black notebook for what you have seen, what you are waiting for, and what is airing tonight.
            </Text>

            <View style={styles.manifestoBulletList}>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletDash}>—</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletEmphasis}>One-tap logging:</Text> Mark an episode finished the second the credits roll.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletDash}>—</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletEmphasis}>Broadcast radar:</Text> Know when your favorite series actually returns, with countdowns and zero spoilers.
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletDash}>—</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bulletEmphasis}>Private reflections:</Text> Keep personal notes when a film stays with you overnight. No public feeds, no clout chasing.
                </Text>
              </View>
            </View>

            <Text style={styles.manifestoSignoff}>
              No ads. No follower counts. No social pressure. Just cinema and your time.
            </Text>

            {/* Quick Actions */}
            <View style={styles.heroCtasRow}>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={handleLaunchApp}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryCtaText}>LAUNCH HOQRUX</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={scrollToInstall}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryCtaText}>HOW TO INSTALL</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Three Quiet Tenets */}
          <View style={styles.tenetsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTag}>[ 01 // HOW IT WORKS ]</Text>
              <Text style={styles.sectionHeaderTitle}>BUILT FOR THE SCREEN, NOT THE FEED</Text>
            </View>

            <View style={[styles.tenetsGrid, isDesktop && styles.tenetsGridDesktop]}>
              <View style={[styles.tenetItem, isDesktop && styles.tenetItemDesktop]}>
                <View style={styles.tenetHeader}>
                  <Text style={styles.tenetIndex}>01</Text>
                  <Text style={styles.tenetTitle}>RELEASE RADAR</Text>
                </View>
                <Text style={styles.tenetDesc}>
                  A live air schedule for television series. Follow upcoming broadcast dates, season drops, and network schedules with accurate countdowns — no spoiler summaries.
                </Text>
              </View>

              <View style={[styles.tenetItem, isDesktop && styles.tenetItemDesktop]}>
                <View style={styles.tenetHeader}>
                  <Text style={styles.tenetIndex}>02</Text>
                  <Text style={styles.tenetTitle}>TACTICAL LOGBOOK</Text>
                </View>
                <Text style={styles.tenetDesc}>
                  Track seasons and film runs with single-tap precision. Rate honestly, maintain custom lists, and write reflections that remain strictly private.
                </Text>
              </View>

              <View style={[styles.tenetItem, isDesktop && styles.tenetItemDesktop]}>
                <View style={styles.tenetHeader}>
                  <Text style={styles.tenetIndex}>03</Text>
                  <Text style={styles.tenetTitle}>UNBIASED DATA</Text>
                </View>
                <Text style={styles.tenetDesc}>
                  Side-by-side TMDB and IMDb scores, original non-English titles, transparent title artwork, and instant availability across streaming platforms.
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Progressive Web App Installation Guide */}
          <View
            style={styles.installSection}
            onLayout={(e) => {
              installSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTag}>[ 02 // INSTALLATION ]</Text>
              <Text style={styles.sectionHeaderTitle}>ADD TO YOUR HOME SCREEN</Text>
            </View>

            <Text style={styles.installLead}>
              Hoqrux is an independent Progressive Web App (PWA). You don&apos;t need to download 150MB from an app store. Add it directly from your browser to run edge-to-edge, full-screen, with instant launch speeds and an icon on your phone or desktop dock.
            </Text>

            {/* Platform Selector Rail */}
            <View style={styles.platformRail}>
              <TouchableOpacity
                style={[
                  styles.platformTab,
                  selectedPlatform === 'ios' && styles.platformTabActive,
                ]}
                onPress={() => {
                  feedback.tap();
                  setSelectedPlatform('ios');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="logo-apple"
                  size={14}
                  color={selectedPlatform === 'ios' ? colors.accent : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.platformTabText,
                    selectedPlatform === 'ios' && styles.platformTabTextActive,
                  ]}
                >
                  IPHONE / SAFARI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.platformTab,
                  selectedPlatform === 'android' && styles.platformTabActive,
                ]}
                onPress={() => {
                  feedback.tap();
                  setSelectedPlatform('android');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="logo-android"
                  size={14}
                  color={selectedPlatform === 'android' ? colors.accent : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.platformTabText,
                    selectedPlatform === 'android' && styles.platformTabTextActive,
                  ]}
                >
                  ANDROID / CHROME
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.platformTab,
                  selectedPlatform === 'desktop' && styles.platformTabActive,
                  { borderRightWidth: 0 },
                ]}
                onPress={() => {
                  feedback.tap();
                  setSelectedPlatform('desktop');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="desktop-outline"
                  size={14}
                  color={selectedPlatform === 'desktop' ? colors.accent : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.platformTabText,
                    selectedPlatform === 'desktop' && styles.platformTabTextActive,
                  ]}
                >
                  MAC & PC
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step-by-Step Instructions */}
            <View style={styles.stepsContainer}>
              {selectedPlatform === 'ios' && (
                <>
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Open in Safari & Tap Share</Text>
                      <Text style={styles.stepInstruction}>
                        Open <Text style={styles.highlightText}>hoqrux.vercel.app</Text> in Safari on your iPhone. Tap the <Text style={styles.highlightText}>Share</Text> button in the bottom navigation bar (the square with an arrow pointing upward).
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Choose &quot;Add to Home Screen&quot;</Text>
                      <Text style={styles.stepInstruction}>
                        Scroll down the share sheet and tap <Text style={styles.highlightText}>&quot;Add to Home Screen&quot;</Text>.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Confirm and Launch</Text>
                      <Text style={styles.stepInstruction}>
                        Tap <Text style={styles.highlightText}>&quot;Add&quot;</Text> at the top right. Hoqrux will appear on your home screen like any native app. Tap it to launch full-screen with no browser address bars.
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {selectedPlatform === 'android' && (
                <>
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Open in Chrome & Tap Menu</Text>
                      <Text style={styles.stepInstruction}>
                        Open Hoqrux in Chrome on your device. Tap the <Text style={styles.highlightText}>three-dot menu (⋮)</Text> in the upper right.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Select &quot;Install app&quot;</Text>
                      <Text style={styles.stepInstruction}>
                        Tap <Text style={styles.highlightText}>&quot;Install app&quot;</Text> (or &quot;Add to Home screen&quot;) from the dropdown menu.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Confirm Installation</Text>
                      <Text style={styles.stepInstruction}>
                        Tap <Text style={styles.highlightText}>&quot;Install&quot;</Text> in the system prompt. Hoqrux is now saved to your app drawer and home screen.
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {selectedPlatform === 'desktop' && (
                <>
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Look at the Address Bar</Text>
                      <Text style={styles.stepInstruction}>
                        In Chrome, Edge, or Brave, look at the right end of the address bar for the <Text style={styles.highlightText}>Install Hoqrux</Text> icon (a small monitor with a downward arrow).
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Click Install</Text>
                      <Text style={styles.stepInstruction}>
                        Click the icon and hit <Text style={styles.highlightText}>&quot;Install&quot;</Text>.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Pin to Dock or Taskbar</Text>
                      <Text style={styles.stepInstruction}>
                        Hoqrux opens immediately in its own borderless window. Pin it to your macOS Dock or Windows Taskbar for instantaneous launch.
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* PWA Benefits Badges */}
            <View style={styles.benefitsRow}>
              <View style={styles.benefitPill}>
                <Ionicons name="flash-sharp" size={11} color={colors.accent} />
                <Text style={styles.benefitPillText}>INSTANT BOOT</Text>
              </View>
              <View style={styles.benefitPill}>
                <Ionicons name="expand-sharp" size={11} color={colors.accent} />
                <Text style={styles.benefitPillText}>100% STANDALONE SCREEN</Text>
              </View>
              <View style={styles.benefitPill}>
                <Ionicons name="eye-off-outline" size={11} color={colors.accent} />
                <Text style={styles.benefitPillText}>ZERO ADVERTISING</Text>
              </View>
              <View style={styles.benefitPill}>
                <Ionicons name="lock-closed-outline" size={11} color={colors.accent} />
                <Text style={styles.benefitPillText}>PRIVATE LOCAL DATA</Text>
              </View>
            </View>
          </View>

          {/* 5. Minimalist Call to Action */}
          <View style={styles.invitationSection}>
            <Text style={styles.invitationHeading}>Ready to start your ledger?</Text>
            <Text style={styles.invitationSub}>
              Everything is saved locally and synced automatically when you sign in.
            </Text>
            <TouchableOpacity
              style={styles.invitationBtn}
              onPress={handleLaunchApp}
              activeOpacity={0.85}
            >
              <Text style={styles.invitationBtnText}>ENTER HOQRUX →</Text>
            </TouchableOpacity>
          </View>

          {/* 6. Understated Cinephile Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>HOQRUX</Text>
            <Text style={styles.footerCopy}>
              A quiet ledger for film and television. Built for people who watch closely.
            </Text>
            <Text style={styles.footerCredits}>
              Artwork and metadata via TMDB and JustWatch. Independent, private, and tracker-free.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  header: {
    backgroundColor: colors.void,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'web' ? ('max(env(safe-area-inset-top, 0px), 10px)' as any) : 6,
    paddingBottom: 10,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  headerInnerDesktop: {
    maxWidth: 960,
    alignSelf: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    fontFamily: typography.fontBrand,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  brandDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderLight,
  },
  brandSubtitle: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
  launchBtnTop: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  launchBtnTopText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  contentContainer: {
    paddingHorizontal: 20,
    width: '100%',
  },
  contentContainerDesktop: {
    maxWidth: 960,
    alignSelf: 'center',
  },

  // Hero Section
  heroSection: {
    paddingTop: 36,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leadTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  leadTagText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  heroTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 38,
    lineHeight: 42,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
    marginBottom: 20,
  },
  manifestoParagraph: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 23,
    color: colors.textSecondary,
    marginBottom: 14,
    maxWidth: 720,
  },
  manifestoBulletList: {
    marginVertical: 10,
    gap: 10,
    maxWidth: 720,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDash: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    color: colors.accent,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
    fontFamily: typography.fontBody,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  bulletEmphasis: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
  },
  manifestoSignoff: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginTop: 8,
    marginBottom: 26,
  },
  heroCtasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 2,
  },
  primaryCtaText: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 2,
  },
  secondaryCtaText: {
    fontFamily: typography.fontBold,
    fontSize: 10.5,
    color: colors.textPrimary,
    letterSpacing: 1,
    includeFontPadding: false,
  },

  // Tenets Section
  tenetsSection: {
    paddingVertical: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderRow: {
    marginBottom: 24,
  },
  sectionTag: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    includeFontPadding: false,
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0.5,
    includeFontPadding: false,
  },
  tenetsGrid: {
    flexDirection: 'column',
    gap: 14,
  },
  tenetsGridDesktop: {
    flexDirection: 'row',
    gap: 16,
  },
  tenetItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    borderRadius: 2,
  },
  tenetItemDesktop: {
    flex: 1,
  },
  tenetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tenetIndex: {
    fontFamily: typography.fontBlack,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  tenetTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  tenetDesc: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  // Install Section
  installSection: {
    paddingVertical: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  installLead: {
    fontFamily: typography.fontBody,
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
    marginBottom: 20,
    maxWidth: 720,
  },
  platformRail: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    marginBottom: 20,
  },
  platformTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  platformTabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  platformTabText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  platformTabTextActive: {
    color: colors.accent,
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 20,
    gap: 18,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: colors.accent,
    includeFontPadding: false,
  },
  stepContent: {
    flex: 1,
  },
  stepHeading: {
    fontFamily: typography.fontBold,
    fontSize: 12.5,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    includeFontPadding: false,
    marginBottom: 4,
  },
  stepInstruction: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  highlightText: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  benefitPillText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },

  // Minimal Call to Action
  invitationSection: {
    marginVertical: 36,
    padding: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    alignItems: 'center',
  },
  invitationHeading: {
    fontFamily: typography.fontBlack,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
    marginBottom: 6,
    textAlign: 'center',
  },
  invitationSub: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 460,
    marginBottom: 16,
    lineHeight: 18,
  },
  invitationBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 2,
  },
  invitationBtnText: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    includeFontPadding: false,
  },

  // Footer
  footer: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerBrand: {
    fontFamily: typography.fontBrand,
    fontSize: 14,
    color: colors.accent,
    letterSpacing: 1,
    includeFontPadding: false,
    marginBottom: 6,
  },
  footerCopy: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerCredits: {
    fontFamily: typography.fontBody,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 14,
  },
});
