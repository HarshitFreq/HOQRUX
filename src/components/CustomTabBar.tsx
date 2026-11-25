/**
 * Bulletproof Swiss Brutalist Tab Bar for Mobile & PWA
 *
 * Replaces React Navigation's default UIKit tab bar with a dedicated,
 * rock-solid custom component that eliminates clipping, layout shifts,
 * and safe-area calculation errors on iOS Safari, Android, and standalone PWAs.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { feedback } from '../utils/feedback';

export interface CustomTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors?: Record<string, any>;
  navigation?: any;
  emitter?: any;
  navigateToTab?: (routeKey: string) => void;
  insets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface TabConfig {
  name: string;
  route: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: {
    name: 'index',
    route: '/(tabs)',
    label: 'NOW',
    activeIcon: 'play-sharp',
    inactiveIcon: 'play-outline',
  },
  search: {
    name: 'search',
    route: '/(tabs)/search',
    label: 'EXPLORE',
    activeIcon: 'search-sharp',
    inactiveIcon: 'search-outline',
  },
  lists: {
    name: 'lists',
    route: '/(tabs)/lists',
    label: 'LISTS',
    activeIcon: 'bookmark-sharp',
    inactiveIcon: 'bookmark-outline',
  },
  activity: {
    name: 'activity',
    route: '/(tabs)/activity',
    label: 'PROFILE',
    activeIcon: 'person-sharp',
    inactiveIcon: 'person-outline',
  },
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  emitter,
  navigateToTab,
  insets,
}: CustomTabBarProps) {
  const isWeb = Platform.OS === 'web';
  const isNativeIOS = Platform.OS === 'ios';

  // Adaptive safe area padding:
  // - iOS Standalone PWA: env(safe-area-inset-bottom) is 34px -> sets padding to 40px (clears Home Indicator)
  // - iOS Safari Browser: env is 0px -> sets padding to 14px (sits directly above Safari toolbar)
  // - Native iOS: insets.bottom (34px) + 6 = 40px
  // - Android / Desktop: 14px
  const webBottomPadding = 'calc(max(env(safe-area-inset-bottom, 0px), 10px) + 6px)';
  const nativeBottomPadding = isNativeIOS
    ? Math.max(insets?.bottom || 0, 32)
    : (insets?.bottom || 0) + 6;

  const dynamicPaddingBottom = isWeb ? (webBottomPadding as any) : nativeBottomPadding;

  const handleTabPress = useCallback(
    (route: { key: string; name: string }, isFocused: boolean, config: TabConfig) => {
      feedback.tap();

      const event = emitter?.emit?.({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event?.defaultPrevented) {
        // Priority 1: React Navigation descriptor navigate
        const descriptorNav = descriptors?.[route.key]?.navigation;
        if (descriptorNav?.navigate) {
          descriptorNav.navigate(route.name);
          return;
        }

        // Priority 2: Direct navigation prop
        if (navigation?.navigate) {
          navigation.navigate(route.name);
          return;
        }

        // Priority 3: Expo Router bottom tab callback
        if (navigateToTab) {
          navigateToTab(route.key);
          return;
        }

        // Priority 4: Expo Router global navigation
        router.navigate(config.route as any);
      }
    },
    [descriptors, emitter, navigation, navigateToTab]
  );

  return (
    <View style={[styles.bar, { paddingBottom: dynamicPaddingBottom }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIGS[route.name] || {
          name: route.name,
          route: `/(tabs)/${route.name}`,
          label: route.name.toUpperCase(),
          activeIcon: 'square' as const,
          inactiveIcon: 'square-outline' as const,
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={`${config.label}, tab, ${index + 1} of ${state.routes.length}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => handleTabPress(route, isFocused, config)}
            onLongPress={() => {
              emitter?.emit?.({
                type: 'tabLongPress',
                target: route.key,
              });
            }}
            style={({ pressed }) => [
              styles.tabItem,
              pressed && styles.tabItemPressed,
            ]}
          >
            <View style={styles.iconContainer} pointerEvents="none">
              <Ionicons
                name={isFocused ? config.activeIcon : config.inactiveIcon}
                size={20}
                color={isFocused ? colors.accent : '#9E9EAA'}
              />
            </View>
            <Text
              style={[
                styles.label,
                isFocused ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.void,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 2,
    ...(Platform.OS === 'web'
      ? {
          touchAction: 'manipulation' as any,
          cursor: 'pointer' as any,
          userSelect: 'none' as any,
        }
      : {}),
  },
  tabItemPressed: {
    opacity: 0.6,
  },
  iconContainer: {
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontFamily: typography.fontBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  labelActive: {
    color: '#FFFFFF',
  },
  labelInactive: {
    color: '#9E9EAA',
  },
});
