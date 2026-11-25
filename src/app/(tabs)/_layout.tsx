import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedback } from '../../utils/feedback';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const isIOS =
    Platform.OS === 'ios' ||
    (isWeb &&
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent || ''));

  // Calibrated bottom padding:
  // On iOS devices with home indicator (iPhone X-16), physical bottom inset is 34px.
  // 36px bottom padding guarantees the text labels sit cleanly above the home indicator.
  const bottomPadding = isIOS ? Math.max(insets.bottom, 36) : (insets.bottom || 0) + 6;
  const barHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          feedback.tap();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#9E9EAA',
        tabBarLabelStyle: {
          fontFamily: typography.fontBold,
          fontSize: 10,
          letterSpacing: 0.8,
          includeFontPadding: false,
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: colors.void,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          elevation: 0,
        },
        tabBarItemStyle: {
          height: 52,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NOW',
          tabBarLabel: 'NOW',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'play-sharp' : 'play-outline'}
              size={20}
              color={focused ? colors.accent : (color as string)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'EXPLORE',
          tabBarLabel: 'EXPLORE',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search-sharp' : 'search-outline'}
              size={20}
              color={focused ? colors.accent : (color as string)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'LISTS',
          tabBarLabel: 'LISTS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bookmark-sharp' : 'bookmark-outline'}
              size={20}
              color={focused ? colors.accent : (color as string)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'PROFILE',
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-sharp' : 'person-outline'}
              size={20}
              color={focused ? colors.accent : (color as string)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
