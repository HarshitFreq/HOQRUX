/**
 * Hoqrux Landing & PWA Installation Guide Screen
 * 
 * Swiss Brutalist showcase detailing:
 * - Brand proposition: Personal Media Radar, Episode Logbook & Airing Calendar
 * - Interactive, platform-adaptive PWA install guide (iOS Safari, Android Chrome, Desktop)
 * - PWA superpowers: Full-screen standalone execution, offline cache, instant launch
 * - Direct "Launch Radar" primary actions
 */

import React, { useState, useMemo } from 'react';
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

  const handleLaunchApp = () => {
    feedback.tap();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.brandRow}>
            <Text style={styles.brandLogo}>HOQRUX</Text>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>PWA // 2.0</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.launchBtnTop}
            onPress={handleLaunchApp}
            activeOpacity={0.8}
          >
            <Text style={styles.launchBtnTopText}>LAUNCH RADAR →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* 2. Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.overlineTag}>
              <View style={styles.livePulseDot} />
              <Text style={styles.overlineText}>CINEMATIC MEDIA RADAR & REEL LOGBOOK</Text>
            </View>

            <Text style={styles.heroTitle}>
              TRACK FILMS.{'\n'}LOG EPISODES.{'\n'}ZERO NOISE.
            </Text>

            <Text style={styles.heroSubtitle}>
              Hoqrux is a progressive media radar designed for speed and clarity.
              Follow weekly TV broadcast schedules, track your personal cinema catalog, and log seasons with single-tap precision.
            </Text>

            {/* Quick CTAs */}
            <View style={styles.heroCtasRow}>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={handleLaunchApp}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryCtaText}>OPEN WEB APP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={() => {
                  feedback.tap();
                  // Pre-select user platform and guide is right below
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryCtaText}>INSTALL AS APP</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Core Pillars Feature Grid */}
          <View style={styles.featuresSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIndex}>[ 01 // CAPABILITIES ]</Text>
              <Text style={styles.sectionHeaderTitle}>DESIGNED FOR THE PURIST</Text>
            </View>

            <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
              {/* Feature 1 */}
              <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
                <View style={styles.featureIconBox}>
                  <Ionicons name="radio-outline" size={18} color={colors.accent} />
                </View>
                <Text style={styles.featureTitle}>RELEASE RADAR</Text>
                <Text style={styles.featureDesc}>
                  Live airing calendar tracking upcoming broadcasts, series premieres, and episode drops with real-time countdown badges.
                </Text>
              </View>

              {/* Feature 2 */}
              <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
                <View style={styles.featureIconBox}>
                  <Ionicons name="film-outline" size={18} color={colors.accent} />
                </View>
                <Text style={styles.featureTitle}>TACTICAL REEL LOGBOOK</Text>
                <Text style={styles.featureDesc}>
                  One-tap episode progress logging with season completion ratios, private reflections, and historical watch-time analytics.
                </Text>
              </View>

              {/* Feature 3 */}
              <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
                <View style={styles.featureIconBox}>
                  <Ionicons name="search-outline" size={18} color={colors.accent} />
                </View>
                <Text style={styles.featureTitle}>OMNI-EXPLORE & CATALOGUE</Text>
                <Text style={styles.featureDesc}>
                  High-speed search across 20+ genres with TMDB and IMDb scores, transparent title logos, and instant streaming provider availability.
                </Text>
              </View>
            </View>
          </View>

          {/* 4. PWA Installation Guide */}
          <View style={styles.installSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionIndex}>[ 02 // INSTALLATION ]</Text>
              <Text style={styles.sectionHeaderTitle}>ADD TO HOME SCREEN</Text>
            </View>

            <Text style={styles.installLead}>
              Hoqrux is built as a Progressive Web App (PWA). Installing it adds an icon to your home screen or dock that runs full-screen with zero browser address bars and instant launch speeds.
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
                  iOS / SAFARI
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
                  DESKTOP / PC
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
                      <Text style={styles.stepHeading}>Open Safari & Tap Share</Text>
                      <Text style={styles.stepInstruction}>
                        Open <Text style={styles.highlightText}>hoqrux.vercel.app</Text> in Safari on your iPhone or iPad. Tap the <Text style={styles.highlightText}>Share</Text> icon at the bottom of the screen (the square with an arrow pointing upward).
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Select &quot;Add to Home Screen&quot;</Text>
                      <Text style={styles.stepInstruction}>
                        Scroll down the action list and tap <Text style={styles.highlightText}>&quot;Add to Home Screen&quot;</Text> (marked with a plus icon).
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Confirm & Launch</Text>
                      <Text style={styles.stepInstruction}>
                        Tap <Text style={styles.highlightText}>&quot;Add&quot;</Text> in the top right corner. The Hoqrux app icon will now appear on your home screen. Tap it to launch full-screen!
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
                      <Text style={styles.stepHeading}>Open Chrome & Tap Menu</Text>
                      <Text style={styles.stepInstruction}>
                        Open Hoqrux in Chrome on your Android device. Tap the <Text style={styles.highlightText}>three-dot menu (⋮)</Text> in the top right corner.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Tap &quot;Install app&quot; or &quot;Add to Home screen&quot;</Text>
                      <Text style={styles.stepInstruction}>
                        Select <Text style={styles.highlightText}>&quot;Install app&quot;</Text> (or &quot;Add to Home screen&quot;) from the dropdown options.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Confirm Install</Text>
                      <Text style={styles.stepInstruction}>
                        Tap <Text style={styles.highlightText}>&quot;Install&quot;</Text> in the confirmation dialog. Hoqrux is now installed in your app drawer and home screen.
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
                      <Text style={styles.stepHeading}>Locate the Address Bar Install Icon</Text>
                      <Text style={styles.stepInstruction}>
                        In Google Chrome, Microsoft Edge, or Brave, look at the right end of the address (URL) bar for the <Text style={styles.highlightText}>Install Hoqrux</Text> icon (a small computer screen with a downward arrow).
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Click &quot;Install&quot;</Text>
                      <Text style={styles.stepInstruction}>
                        Click the icon and select <Text style={styles.highlightText}>&quot;Install&quot;</Text> when prompted.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepHeading}>Launch as Desktop App</Text>
                      <Text style={styles.stepInstruction}>
                        Hoqrux will immediately open in its own dedicated, borderless desktop window. You can pin it to your Mac Dock or Windows Taskbar for instant access.
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* PWA Benefits Badges */}
            <View style={styles.benefitsRow}>
              <View style={styles.benefitPill}>
                <Ionicons name="flash-sharp" size={12} color={colors.accent} />
                <Text style={styles.benefitPillText}>INSTANT BOOT (&lt;1s)</Text>
              </View>
              <View style={styles.benefitPill}>
                <Ionicons name="expand-sharp" size={12} color={colors.accent} />
                <Text style={styles.benefitPillText}>100% FULL SCREEN</Text>
              </View>
              <View style={styles.benefitPill}>
                <Ionicons name="cloud-offline-sharp" size={12} color={colors.accent} />
                <Text style={styles.benefitPillText}>OFFLINE CACHE</Text>
              </View>
            </View>
          </View>

          {/* 5. Bottom Action & Launch Callout */}
          <View style={styles.bottomCallout}>
            <Text style={styles.bottomCalloutTitle}>READY TO CALIBRATE YOUR RADAR?</Text>
            <Text style={styles.bottomCalloutSub}>
              Launch the application directly in your browser. All your tracking data is securely synced and preserved.
            </Text>
            <TouchableOpacity
              style={styles.bottomLaunchBtn}
              onPress={handleLaunchApp}
              activeOpacity={0.85}
            >
              <Text style={styles.bottomLaunchBtnText}>ENTER HOQRUX NOW →</Text>
            </TouchableOpacity>
          </View>

          {/* 6. Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              HOQRUX // ASIMOVIAN BRUTALIST ARCHITECTURE • BUILT FOR SPEED
            </Text>
            <Text style={styles.footerSub}>
              All poster artwork and episode metadata provided by TMDB. Zero third-party advertisements or trackers.
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    fontFamily: typography.fontBrand,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  brandBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: 0.8,
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },

  // Hero Section
  heroSection: {
    paddingTop: 36,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  overlineText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: 1.5,
    includeFontPadding: false,
  },
  heroTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 42,
    lineHeight: 46,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 680,
    marginBottom: 24,
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
    paddingHorizontal: 20,
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
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 1,
    includeFontPadding: false,
  },

  // Capabilities
  featuresSection: {
    paddingVertical: 36,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderRow: {
    marginBottom: 20,
  },
  sectionIndex: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: 1.5,
    includeFontPadding: false,
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0.5,
    includeFontPadding: false,
  },
  featuresGrid: {
    flexDirection: 'column',
    gap: 14,
  },
  featuresGridDesktop: {
    flexDirection: 'row',
    gap: 16,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    borderRadius: 2,
  },
  featureCardDesktop: {
    flex: 1,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.8,
    includeFontPadding: false,
    marginBottom: 6,
  },
  featureDesc: {
    fontFamily: typography.fontBody,
    fontSize: 11.5,
    lineHeight: 18,
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
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 20,
    maxWidth: 750,
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
    fontSize: 10,
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
    width: 26,
    height: 26,
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
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.5,
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
    gap: 10,
    marginTop: 18,
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
  },
  benefitPillText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },

  // Bottom Callout
  bottomCallout: {
    marginVertical: 36,
    padding: 24,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    alignItems: 'center',
    textAlign: 'center',
  },
  bottomCalloutTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1,
    includeFontPadding: false,
    marginBottom: 8,
    textAlign: 'center',
  },
  bottomCalloutSub: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 500,
    marginBottom: 18,
    lineHeight: 18,
  },
  bottomLaunchBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 2,
  },
  bottomLaunchBtnText: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    includeFontPadding: false,
  },

  // Footer
  footer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.2,
    includeFontPadding: false,
    marginBottom: 6,
    textAlign: 'center',
  },
  footerSub: {
    fontFamily: typography.fontBody,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 14,
  },
});
