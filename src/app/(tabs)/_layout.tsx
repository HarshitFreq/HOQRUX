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

  // On iOS devices with home indicator (iPhone X-16), physical bottom inset is 34px.
  // On Android/desktop, bottom inset is 0-16px.
  const bottomInset = Math.max(insets.bottom, isIOS ? 30 : 6);
  const bottomPadding = isIOS ? Math.max(bottomInset, 30) : bottomInset + 4;
  // Tab items need 52px (28px icon + 12px label + padding). Total height = 54 + 4(paddingTop) + bottomPadding
  const barHeight = 58 + bottomPadding;

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
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: '#9E9EAA',
        tabBarLabelStyle: {
          fontFamily: typography.fontBold,
          fontSize: 10,
          letterSpacing: isIOS ? 0.8 : 0,
          includeFontPadding: false,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.void,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 4,
          paddingBottom: bottomPadding,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
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
              size={19}
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
              size={19}
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
              size={19}
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
              size={19}
              color={focused ? colors.accent : (color as string)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
