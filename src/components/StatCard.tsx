import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  indexCode?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = memo(({
  label,
  value,
  subValue,
  indexCode,
  accentColor = colors.textPrimary,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        {indexCode ? <Text style={styles.indexCode}>{indexCode}</Text> : null}
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subValue ? <Text style={styles.subValue}>{subValue.toUpperCase()}</Text> : null}
    </View>
  );
});

StatCard.displayName = 'StatCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 3,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    minWidth: 130,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: typography.fontSemiBold,
    letterSpacing: Platform.OS === 'ios' ? 1.2 : 0,
    includeFontPadding: false,
  },
  indexCode: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: typography.fontMedium,
    includeFontPadding: false,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: typography.fontBlack,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  subValue: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: typography.fontMedium,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
    marginTop: 4,
  },
});
