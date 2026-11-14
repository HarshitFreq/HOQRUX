import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, View, Platform } from 'react-native';
import { StreamingProvider } from '../services/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StreamingBadgeProps {
  provider: StreamingProvider;
  compact?: boolean;
}

export const StreamingBadge: React.FC<StreamingBadgeProps> = ({ provider, compact = false }) => {
  const handlePress = async () => {
    try {
      if (provider.appUrl && (await Linking.canOpenURL(provider.appUrl))) {
        await Linking.openURL(provider.appUrl);
      } else if (provider.webUrl) {
        await Linking.openURL(provider.webUrl);
      }
    } catch {
      if (provider.webUrl) {
        Linking.openURL(provider.webUrl);
      }
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[styles.badge, compact && styles.compactBadge]}
    >
      <Text style={[styles.name, compact && styles.compactName]} numberOfLines={1}>
        {provider.name.toUpperCase()}
      </Text>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{provider.type.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 2,
    marginRight: 6,
    marginBottom: 6,
  },
  compactBadge: {
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontBold,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
  compactName: {
    fontSize: 10,
  },
  tag: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 6,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: '800',
    fontFamily: typography.fontBold,
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    includeFontPadding: false,
  },
});
