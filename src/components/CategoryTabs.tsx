/**
 * CategoryTabs & Sticky Top Bar Component
 * 
 * Swiss Precision Segmented Rail & Brand Header:
 * - Prominent Asimovian brand title 'HOQRUX'.
 * - Full-width segmented category rail (ALL, CINEMA, SERIES, ANIME).
 * - Active segment indicator with vermilion accent dot.
 * - Hairline perimeter borders and zero glassmorphism.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export type HomeCategory = 'all' | 'movies' | 'tv' | 'anime';

interface CategoryTabsProps {
  selectedCategory: HomeCategory;
  onSelectCategory: (category: HomeCategory) => void;
}

const CATEGORIES: { id: HomeCategory; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'movies', label: 'CINEMA' },
  { id: 'tv', label: 'SERIES' },
  { id: 'anime', label: 'ANIME' },
];

export const CategoryTabs: React.FC<CategoryTabsProps> = memo(({
  selectedCategory,
  onSelectCategory,
}) => {
  const handleTabPress = (cat: HomeCategory) => {
    Haptics.selectionAsync();
    onSelectCategory(cat);
  };

  return (
    <View style={styles.stickyHeaderContainer}>
      {/* Top Branding Bar */}
      <View style={styles.topRow}>
        <Text
          style={styles.logoTitle}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.25}
        >
          HOQRUX
        </Text>

        <TouchableOpacity
          style={styles.searchIconButton}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={17} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Swiss Precision Segmented Category Rail */}
      <View style={styles.tabsRow}>
        <View style={styles.segmentedRail}>
          {CATEGORIES.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.8}
                onPress={() => handleTabPress(tab.id)}
                style={[
                  styles.segmentItem,
                  isActive && styles.segmentItemActive,
                ]}
              >
                {isActive && <View style={styles.activeDot} />}
                <Text
                  style={[
                    styles.segmentText,
                    isActive ? styles.segmentTextActive : styles.segmentTextInactive,
                  ]}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.2}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

CategoryTabs.displayName = 'CategoryTabs';

const styles = StyleSheet.create({
  stickyHeaderContainer: {
    backgroundColor: colors.void,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingTop: 4,
    paddingBottom: 10,
    zIndex: 50,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  logoTitle: {
    fontFamily: typography.fontBrand,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    includeFontPadding: false,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    paddingHorizontal: 16,
  },
  segmentedRail: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 2.5,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 2,
  },
  segmentItemActive: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginRight: 5,
  },
  segmentText: {
    fontSize: 10,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  segmentTextActive: {
    fontFamily: typography.fontBold,
    color: colors.textPrimary,
  },
  segmentTextInactive: {
    fontFamily: typography.fontBold,
    color: '#9E9EAA',
  },
});
