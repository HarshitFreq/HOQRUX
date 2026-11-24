import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export async function selectionAsync(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'ios') {
      await ExpoHaptics.selectionAsync();
    } else if (Platform.OS === 'android') {
      await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Graceful no-op on platforms/emulators without native vibration engine
  }
}

export async function impactAsync(
  style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ExpoHaptics.impactAsync(style);
  } catch {
    // Graceful no-op
  }
}

export async function notificationAsync(
  type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await ExpoHaptics.notificationAsync(type);
  } catch {
    // Graceful no-op
  }
}

export const haptics = {
  selection: selectionAsync,
  impact: impactAsync,
  notification: notificationAsync,
};

export const Haptics = {
  selectionAsync,
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
};

export default Haptics;
