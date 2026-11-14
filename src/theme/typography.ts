import { Platform, PixelRatio } from 'react-native';

/**
 * Dynamic Font Size Helper
 * Scales font sizes according to OS Accessibility / Display text settings
 * with a protective upper bound to maintain UI harmony and prevent clipping.
 */
export function getDynamicFontSize(baseSize: number, maxMultiplier = 1.3): number {
  const fontScale = PixelRatio.getFontScale();
  return Math.round(baseSize * Math.min(fontScale, maxMultiplier));
}

export const typography = {
  fontBrand: Platform.select({
    ios: 'Asimovian-Regular',
    android: 'Asimovian-Regular',
    default: 'Asimovian-Regular, Satoshi-Black, sans-serif',
  }),
  fontBlack: Platform.select({
    ios: 'Satoshi-Black',
    android: 'Satoshi-Black',
    default: 'Satoshi-Black, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
  fontTitle: Platform.select({
    ios: 'Satoshi-Bold',
    android: 'Satoshi-Bold',
    default: 'Satoshi-Bold, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
  fontBold: Platform.select({
    ios: 'Satoshi-Bold',
    android: 'Satoshi-Bold',
    default: 'Satoshi-Bold, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
  fontSemiBold: Platform.select({
    ios: 'Satoshi-Bold',
    android: 'Satoshi-Bold',
    default: 'Satoshi-Bold, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
  fontMedium: Platform.select({
    ios: 'Satoshi-Medium',
    android: 'Satoshi-Medium',
    default: 'Satoshi-Medium, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
  fontBody: Platform.select({
    ios: 'Satoshi-Regular',
    android: 'Satoshi-Regular',
    default: 'Satoshi-Regular, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
  fontLight: Platform.select({
    ios: 'Satoshi-Light',
    android: 'Satoshi-Light',
    default: 'Satoshi-Light, Inter, -apple-system, system-ui, Helvetica, sans-serif',
  }),
};
