import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationPriority } from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ENABLED_KEY = 'hoqrux_notifications_enabled';
const AUTO_SYNC_QUEUE_KEY = 'hoqrux_auto_sync_queue_radar';
const SCHEDULED_ALERTS_KEY = 'hoqrux_scheduled_alerts';
const CHANNEL_ID = 'release-radar';

export interface ReleaseAlertItem {
  id: string | number;
  title: string;
  type?: 'movie' | 'tv' | 'anime';
  releaseDate: string; // YYYY-MM-DD
  episodeInfo?: string; // e.g. "S02E05: The Reckoning"
  posterPath?: string;
  notificationId?: string;
}

// Map of itemId -> notificationId
type ScheduledAlertsMap = Record<string, { notificationId: string; item: ReleaseAlertItem }>;

let isInitialized = false;

/** Initialize notification handler and Android notification channel */
export async function initNotifications(): Promise<void> {
  if (isInitialized || Platform.OS === 'web') return;
  isInitialized = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Release Radar',
        description: 'Broadcast notifications for new episodes and film releases',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E50914',
        enableLights: true,
        enableVibrate: true,
      });
    }
  } catch (error) {
    console.warn('[NotificationService] Init error:', error);
  }
}

/** Check and request notification permissions */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[NotificationService] Permission request failed:', error);
    return false;
  }
}

/** Check if global notifications setting is enabled */
export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/** Toggle global notifications setting */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  } catch (error) {
    console.warn('[NotificationService] Failed to set notifications enabled:', error);
  }
}

/** Get all currently tracked release alerts */
export async function getScheduledAlerts(): Promise<ScheduledAlertsMap> {
  try {
    const data = await AsyncStorage.getItem(SCHEDULED_ALERTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/** Check if a specific media title has a release alert scheduled */
export async function isReleaseAlertScheduled(itemId: string | number): Promise<boolean> {
  const alerts = await getScheduledAlerts();
  return Boolean(alerts[String(itemId)]);
}

/**
 * Schedule a release alert for an upcoming episode or film airdate.
 * Defaults to 9:00 AM on the air date. If date is today/past, schedules in 10s for immediate feedback.
 */
export async function scheduleReleaseAlert(item: ReleaseAlertItem): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    await initNotifications();

    const enabled = await isNotificationsEnabled();
    if (!enabled) return null;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    // Determine trigger time
    const airDate = new Date(item.releaseDate);
    airDate.setHours(9, 0, 0, 0);

    const now = new Date();
    let trigger: Notifications.NotificationTriggerInput;

    if (airDate.getTime() > now.getTime()) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: airDate,
      };
    } else {
      // If date is today or soon, schedule in 10 seconds for user feedback
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        channelId: CHANNEL_ID,
      };
    }

    const bodyText = item.episodeInfo
      ? `New Broadcast: ${item.episodeInfo} airs today.`
      : `Official release today on your radar.`;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `HOQRUX // ${item.title.toUpperCase()}`,
        body: bodyText,
        data: {
          url: `/title/${item.id}?type=${item.type || 'tv'}`,
          id: item.id,
          type: item.type || 'tv',
        },
        priority: AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    // Save to storage
    const alerts = await getScheduledAlerts();
    alerts[String(item.id)] = {
      notificationId,
      item: { ...item, notificationId },
    };
    await AsyncStorage.setItem(SCHEDULED_ALERTS_KEY, JSON.stringify(alerts));

    return notificationId;
  } catch (error) {
    console.warn('[NotificationService] Failed to schedule alert:', error);
    return null;
  }
}

/** Cancel a scheduled release alert */
export async function cancelReleaseAlert(itemId: string | number): Promise<boolean> {
  try {
    const alerts = await getScheduledAlerts();
    const alertEntry = alerts[String(itemId)];

    if (alertEntry?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(alertEntry.notificationId);
      delete alerts[String(itemId)];
      await AsyncStorage.setItem(SCHEDULED_ALERTS_KEY, JSON.stringify(alerts));
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[NotificationService] Failed to cancel alert:', error);
    return false;
  }
}

/** Check if Auto-Sync Queue Radar is enabled */
export async function isAutoSyncQueueEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(AUTO_SYNC_QUEUE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/** Toggle Auto-Sync Queue Radar setting */
export async function setAutoSyncQueueEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_SYNC_QUEUE_KEY, String(enabled));
  } catch (error) {
    console.warn('[NotificationService] Failed to set auto-sync queue enabled:', error);
  }
}

export interface SyncQueueResult {
  newlyScheduled: number;
  totalActive: number;
}

/**
 * Automatically schedule notification alerts at 9:00 AM on air dates
 * for all upcoming episodes/films in the user's active queue.
 * Only schedules future or today broadcasts (does not schedule past episodes).
 */
export async function syncQueueRadarAlerts(
  episodes: {
    showId: string;
    showTitle: string;
    airDate: string;
    seasonNumber?: number;
    episodeNumber?: number;
    episodeTitle?: string;
    daysUntil: number;
    showPoster?: string;
  }[]
): Promise<SyncQueueResult> {
  if (Platform.OS === 'web') return { newlyScheduled: 0, totalActive: 0 };

  try {
    const autoSyncActive = await isAutoSyncQueueEnabled();
    if (!autoSyncActive) {
      const currentAlerts = await getScheduledAlerts();
      return { newlyScheduled: 0, totalActive: Object.keys(currentAlerts).length };
    }

    const currentAlerts = await getScheduledAlerts();
    let newlyScheduled = 0;

    for (const ep of episodes) {
      // Only schedule upcoming broadcasts (today or future)
      if (ep.daysUntil < 0) continue;

      const key = String(ep.showId);
      if (!currentAlerts[key]) {
        const episodeInfo =
          ep.seasonNumber !== undefined && ep.episodeNumber !== undefined
            ? `S${ep.seasonNumber}:E${ep.episodeNumber}${ep.episodeTitle ? ` "${ep.episodeTitle}"` : ''}`
            : undefined;

        const notifId = await scheduleReleaseAlert({
          id: ep.showId,
          title: ep.showTitle,
          releaseDate: ep.airDate,
          type: 'tv',
          episodeInfo,
          posterPath: ep.showPoster,
        });

        if (notifId) {
          newlyScheduled++;
        }
      }
    }

    const finalAlerts = await getScheduledAlerts();
    return {
      newlyScheduled,
      totalActive: Object.keys(finalAlerts).length,
    };
  } catch (error) {
    console.warn('[NotificationService] syncQueueRadarAlerts failed:', error);
    return { newlyScheduled: 0, totalActive: 0 };
  }
}


