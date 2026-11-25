/**
 * Hoqrux Landing & PWA Installation Guide
 * 
 * Minimal, clean presentation using simple, common English words.
 * Pitch-black background, crisp typography, and easy install steps.
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
          {/* Top Brand Marker */}
          <View style={styles.brandRow}>
            <Text style={styles.brandLogo}>HOQRUX</Text>
          </View>

          {/* Stark Headline */}
          <Text style={styles.headline}>
            A quiet place for movies and shows.
          </Text>

          {/* Candid Plain English Description */}
          <Text style={styles.bodyParagraph}>
            Most apps want you to scroll feeds, write reviews for likes, and watch ads.
          </Text>

          <Text style={styles.bodyParagraph}>
            Hoqrux is just a simple notebook for what you watch. Mark an episode when you finish it, see when the next one airs, and write quick notes just for yourself.
          </Text>

          <Text style={styles.bodyFootnote}>
            No ads. No followers. No feeds.
          </Text>

          {/* Direct Entry Button */}
          <TouchableOpacity
            style={styles.enterButton}
            onPress={handleLaunchApp}
            activeOpacity={0.85}
          >
            <Text style={styles.enterButtonText}>OPEN THE APP →</Text>
          </TouchableOpacity>

          {/* Extremely Minimal PWA Installation Card */}
          <View style={styles.installBlock}>
            <View style={styles.installHeaderRow}>
              <Text style={styles.installTag}>ADD TO HOME SCREEN</Text>
              <Text style={styles.installSub}>NO APP STORE NEEDED</Text>
            </View>

            {/* Platform Selector Tabs */}
            <View style={styles.platformTabs}>
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
                <Text
                  style={[
                    styles.platformTabText,
                    selectedPlatform === 'ios' && styles.platformTabTextActive,
                  ]}
                >
                  iPhone
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
                <Text
                  style={[
                    styles.platformTabText,
                    selectedPlatform === 'android' && styles.platformTabTextActive,
                  ]}
                >
                  Android
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
                <Text
                  style={[
                    styles.platformTabText,
                    selectedPlatform === 'desktop' && styles.platformTabTextActive,
                  ]}
                >
                  Mac & PC
                </Text>
              </TouchableOpacity>
            </View>

            {/* Instruction Snippet */}
            <View style={styles.instructionBody}>
              {selectedPlatform === 'ios' && (
                <Text style={styles.instructionText}>
                  In Safari, tap <Text style={styles.highlight}>Share</Text> (the square with an arrow pointing up) → tap <Text style={styles.highlight}>Add to Home Screen</Text> → tap <Text style={styles.highlight}>Add</Text>.
                </Text>
              )}

              {selectedPlatform === 'android' && (
                <Text style={styles.instructionText}>
                  In Chrome, tap the <Text style={styles.highlight}>three dots (⋮)</Text> in the top right → select <Text style={styles.highlight}>Install app</Text> (or Add to Home screen).
                </Text>
              )}

              {selectedPlatform === 'desktop' && (
                <Text style={styles.instructionText}>
                  In Chrome, Edge, or Brave, click the <Text style={styles.highlight}>Install button (⊕)</Text> in the address bar to add Hoqrux to your computer.
                </Text>
              )}
            </View>
          </View>

          {/* Minimal Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              HOQRUX • FREE • NO ADS • DATA FROM TMDB
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    minHeight: '100%',
    justifyContent: 'center',
  },
  scrollContentDesktop: {
    paddingVertical: 64,
  },
  container: {
    width: '100%',
  },
  containerDesktop: {
    maxWidth: 580,
    alignSelf: 'center',
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  brandLogo: {
    fontFamily: typography.fontBrand,
    fontSize: 24,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },

  // Headline
  headline: {
    fontFamily: typography.fontBlack,
    fontSize: 34,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? -0.5 : 0,
    includeFontPadding: false,
    marginBottom: 20,
  },

  // Manifesto Copy
  bodyParagraph: {
    fontFamily: typography.fontBody,
    fontSize: 14.5,
    lineHeight: 23,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  bodyFootnote: {
    fontFamily: typography.fontBold,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: 0.4,
    marginTop: 4,
    marginBottom: 28,
  },

  // Button
  enterButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 2,
    alignItems: 'center',
    marginBottom: 40,
  },
  enterButtonText: {
    fontFamily: typography.fontBlack,
    fontSize: 11.5,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    includeFontPadding: false,
  },

  // Minimal Install Box
  installBlock: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    padding: 16,
    marginBottom: 36,
  },
  installHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  installTag: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.textPrimary,
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
  installSub: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  platformTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 12,
  },
  platformTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  platformTabActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  platformTabText: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  platformTabTextActive: {
    color: colors.accent,
  },
  instructionBody: {
    paddingVertical: 4,
  },
  instructionText: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  highlight: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: typography.fontBold,
    fontSize: 8.5,
    color: colors.textMuted,
    letterSpacing: 1.2,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
