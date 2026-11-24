import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from './haptics';

const HAPTICS_STORAGE_KEY = 'hoqrux_haptics_enabled';

let hapticsEnabled = true;
let isInitialized = false;

type SettingsListener = (settings: { haptics: boolean }) => void;
const listeners: Set<SettingsListener> = new Set();

async function initFeedback() {
  if (isInitialized) return;
  isInitialized = true;
  try {
    const hapticVal = await AsyncStorage.getItem(HAPTICS_STORAGE_KEY);
    if (hapticVal !== null) {
      hapticsEnabled = hapticVal === 'true';
    }
  } catch {
    // Keep defaults
  }
}

export const feedback = {
  /** Initialize feedback settings from storage */
  init: initFeedback,

  /** Standard light tactile tap (buttons, cards, chips) */
  tap: () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /** Snappy tactile switch (filters, checkboxes, segment selectors) */
  toggle: () => {
    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }
  },

  /** Satisfying confirmation (episode logged, watchlist saved, completed) */
  success: () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /** Cautionary tactile impact (remove item, clear filter) */
  warning: () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  /** Error or alert impact */
  error: () => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /** Getters */
  isHapticsEnabled: () => hapticsEnabled,

  /** Setters with storage persistence */
  setHapticsEnabled: async (enabled: boolean) => {
    hapticsEnabled = enabled;
    try {
      await AsyncStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
    } catch {}
    listeners.forEach((l) => l({ haptics: hapticsEnabled }));
  },

  /** Subscribe to settings changes */
  subscribe: (listener: SettingsListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Initialize immediately in background
initFeedback();

export default feedback;
