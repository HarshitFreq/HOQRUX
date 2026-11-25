import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { AuthProvider } from '../context/AuthContext';
import { TrackingProvider } from '../context/TrackingContext';
import { initNotifications } from '../services/notificationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Enable react-native-screens across all platforms (including web)
// This ensures inactive tab screens acquire display: none and do not steal touches or freeze the DOM
enableScreens(true);

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.errorContainer}>
      <View style={styles.errorCard}>
        <View style={styles.errorBadgeRow}>
          <View style={styles.errorStatusDot} />
          <Text style={styles.errorBadgeText}>[CRITICAL_SIGNAL_FAULT]</Text>
        </View>

        <Text style={styles.errorTitle}>SYSTEM DISRUPTION</Text>
        <Text style={styles.errorDesc}>
          An unexpected interruption occurred within the media processing pipeline.
        </Text>

        <View style={styles.traceBox}>
          <Text style={styles.traceText} numberOfLines={4}>
            {error.message || 'Unknown runtime error.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>REINITIALIZE RADAR</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const HoqruxDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.void,
    card: colors.void,
    border: colors.border,
    text: colors.textPrimary,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  // Preload Satoshi font family and Asimovian for brand logo
  const [fontsLoaded] = useFonts({
    'Satoshi-Black': require('../../assets/fonts/Satoshi-Black.ttf'),
    'Satoshi-Bold': require('../../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Medium': require('../../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Regular': require('../../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Light': require('../../assets/fonts/Satoshi-Light.ttf'),
    'Asimovian-Regular': require('../../assets/fonts/Asimovian-Regular.ttf'),
  });

  useEffect(() => {
    initNotifications();

    if (Platform.OS === 'web') return;

    // Check if app was opened by a notification tap
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      const url = lastResponse.notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as any);
      }
    }

    // Listen for notification responses while running
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as any);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.void }} />;
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.void }}>
      <AuthProvider>
        <TrackingProvider>
          <StatusBar style="light" />
          <ThemeProvider value={HoqruxDarkTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                animation: Platform.OS === 'web' ? 'none' : 'fade',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: colors.void } }} />
              <Stack.Screen
                name="title/[id]"
                options={{
                  headerShown: false,
                  animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
                  contentStyle: { backgroundColor: colors.void },
                }}
              />
              <Stack.Screen
                name="list/[id]"
                options={{
                  headerShown: false,
                  animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
                  contentStyle: { backgroundColor: colors.void },
                }}
              />
              <Stack.Screen
                name="radar"
                options={{
                  headerShown: false,
                  animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
                  contentStyle: { backgroundColor: colors.void },
                }}
              />
              <Stack.Screen
                name="+not-found"
                options={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.void },
                }}
              />
            </Stack>
          </ThemeProvider>
        </TrackingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.void,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 24,
    borderRadius: 2,
  },
  errorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  errorStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  errorBadgeText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  errorTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    marginBottom: 8,
  },
  errorDesc: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  traceBox: {
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 2,
    marginBottom: 20,
  },
  traceText: {
    fontFamily: typography.fontMedium,
    fontSize: 10,
    color: colors.accent,
    lineHeight: 15,
  },
  retryBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 12,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: colors.void,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
});

