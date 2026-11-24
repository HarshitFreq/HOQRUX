import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, View, Platform } from 'react-native';
import { StreamingProvider } from '../services/types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { feedback } from '../utils/feedback';
import { resolveStreamingUrls, isDirectStreamingUrl } from '../utils/streamingLinks';

interface StreamingBadgeProps {
  provider: StreamingProvider;
  mediaTitle?: string;
  compact?: boolean;
}

export const StreamingBadge: React.FC<StreamingBadgeProps> = ({
  provider,
  mediaTitle = '',
  compact = false,
}) => {
  // Validate or resolve direct platform URL on the fly
  const resolved = React.useMemo(() => {
    if (isDirectStreamingUrl(provider.webUrl)) {
      return {
        webUrl: provider.webUrl!,
        appUrl: provider.appUrl,
        badgeColor: provider.badgeColor || '#1A1A24',
      };
    }
    return resolveStreamingUrls(provider.name, mediaTitle, provider.type);
  }, [provider.name, provider.webUrl, provider.appUrl, provider.type, provider.badgeColor, mediaTitle]);

  const handlePress = async () => {
    feedback.tap();

    // On Web / PWA, directly open external platform link in a new tab to avoid Safari popup blocking
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (resolved.webUrl) {
        window.open(resolved.webUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    try {
      if (resolved.appUrl && (await Linking.canOpenURL(resolved.appUrl))) {
        await Linking.openURL(resolved.appUrl);
        return;
      }
      if (resolved.webUrl) {
        await Linking.openURL(resolved.webUrl);
      }
    } catch {
      if (resolved.webUrl) {
        Linking.openURL(resolved.webUrl);
      }
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        styles.badge,
        compact && styles.compactBadge,
      ]}
    >
      <View
        style={[
          styles.colorIndicator,
          { backgroundColor: resolved.badgeColor || colors.accent },
        ]}
      />
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
  colorIndicator: {
    width: 4,
    height: 10,
    borderRadius: 1,
    marginRight: 6,
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
