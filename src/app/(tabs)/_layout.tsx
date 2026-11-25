import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedback } from '../../utils/feedback';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function createTabLabel(label: string) {
  function TabLabel({ focused }: { focused: boolean }) {
    return (
      <Text
        numberOfLines={1}
        style={{
          fontFamily: typography.fontBold,
          fontSize: 10,
          lineHeight: 13,
          color: focused ? '#FFFFFF' : '#9E9EAA',
          letterSpacing: 0.8,
          includeFontPadding: false,
          marginTop: 2,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
    );
  }
  TabLabel.displayName = `TabLabel(${label})`;
  return TabLabel;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;
  // Compact Swiss Brutalist tab bar: 56px content height + safe area bottom inset
  const barHeight = 56 + bottomInset;

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
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#9E9EAA',
        tabBarStyle: {
          backgroundColor: colors.void,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 4,
          paddingBottom: bottomInset,
          elevation: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          height: 48,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NOW',
          tabBarLabel: createTabLabel('NOW'),
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
          tabBarLabel: createTabLabel('EXPLORE'),
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
          tabBarLabel: createTabLabel('LISTS'),
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
          tabBarLabel: createTabLabel('PROFILE'),
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
