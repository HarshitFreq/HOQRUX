import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Platform, useWindowDimensions } from 'react-native';
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
  const { width: windowWidth } = useWindowDimensions();
  const bottomInset = insets.bottom || 0;
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && windowWidth >= 768;
  const webBottomPadding = isDesktop ? 6 : 'max(env(safe-area-inset-bottom, 0px), 16px)';
  const webBarHeight = isDesktop ? 60 : 'calc(52px + max(env(safe-area-inset-bottom, 0px), 16px))';
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
        sceneStyle: { backgroundColor: colors.void },
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#9E9EAA',
        tabBarStyle: {
          backgroundColor: colors.void,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: isWeb ? (webBarHeight as any) : barHeight,
          paddingTop: 5,
          paddingBottom: isWeb ? (webBottomPadding as any) : bottomInset,
          elevation: 0,
          ...(isDesktop
            ? {
                position: 'absolute',
                bottom: 20,
                left: 0,
                right: 0,
                marginHorizontal: 'auto',
                maxWidth: 540,
                width: '90%',
                borderRadius: 28,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
              }
            : {}),
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          height: 46,
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
