import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { haptics } from '../utils/haptics';

export default function NotFoundScreen() {
  const handleReturn = () => {
    haptics.impact();
    router.replace('/(tabs)');
  };

  return (
    <>
      <Stack.Screen options={{ title: '404 // NOT FOUND', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          {/* Status Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeText}>[STATUS: 404_UNRESOLVED]</Text>
          </View>

          {/* Glitch / Error Code */}
          <Text style={styles.errorCode}>404</Text>
          <Text style={styles.errorTitle}>SIGNAL LOST</Text>

          {/* Description */}
          <Text style={styles.errorDescription}>
            The title, transmission frequency, or route you requested does not exist on the radar grid.
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.returnButton}
            onPress={handleReturn}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={16} color={colors.void} style={{ marginRight: 6 }} />
            <Text style={styles.returnButtonText}>RETURN TO RADAR</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Swiss Monospace Tag */}
        <Text style={styles.footerTag}>HOQRUX // BROADCAST SUBSYSTEM v1.0.0</Text>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 24,
    borderRadius: 2,
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: typography.fontBold,
    fontSize: 9.5,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 1.5 : 0,
    includeFontPadding: false,
  },
  errorCode: {
    fontFamily: typography.fontBlack,
    fontSize: 48,
    color: colors.textPrimary,
    lineHeight: 52,
    letterSpacing: -1,
  },
  errorTitle: {
    fontFamily: typography.fontBlack,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: Platform.OS === 'ios' ? 2 : 0,
    marginBottom: 12,
  },
  errorDescription: {
    fontFamily: typography.fontBody,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 24,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 2,
    width: '100%',
  },
  returnButtonText: {
    fontFamily: typography.fontBlack,
    fontSize: 11,
    color: colors.void,
    letterSpacing: Platform.OS === 'ios' ? 1 : 0,
    includeFontPadding: false,
  },
  footerTag: {
    position: 'absolute',
    bottom: 24,
    fontFamily: typography.fontBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
});
