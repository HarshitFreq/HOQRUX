import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../context/AuthContext';
import { TrackingProvider } from '../context/TrackingContext';
import { colors } from '../theme/colors';

export default function RootLayout() {
  // Preload Satoshi font family and Asimovian for brand logo
  useFonts({
    'Satoshi-Black': require('../../assets/fonts/Satoshi-Black.ttf'),
    'Satoshi-Bold': require('../../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Medium': require('../../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Regular': require('../../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Light': require('../../assets/fonts/Satoshi-Light.ttf'),
    'Asimovian-Regular': require('../../assets/fonts/Asimovian-Regular.ttf'),
  });

  return (
    <AuthProvider>
      <TrackingProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.void },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="title/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="list/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="radar"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </TrackingProvider>
    </AuthProvider>
  );
}
