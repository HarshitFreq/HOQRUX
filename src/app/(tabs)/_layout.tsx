import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Generous bottom padding to clear Android navigation gestures and iOS home indicator
  const bottomInset = Math.max(insets.bottom, 12);
  const bottomPadding = Platform.OS === 'ios' ? Math.max(bottomInset, 26) : bottomInset + 10;
  const barHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: '#9E9EAA',
        tabBarLabelStyle: {
          fontFamily: typography.fontBold,
          fontSize: 10,
          letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
          includeFontPadding: false,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.void,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
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
