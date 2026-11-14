import { Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MediaItem } from './types';

export const trailerService = {
  /**
   * Generates native app and web URLs for a YouTube video key or search query
   */
  getYoutubeUrls(trailerKey?: string, title?: string): { appUrl: string; webUrl: string } {
    if (trailerKey && /^[a-zA-Z0-9_-]{11}$/.test(trailerKey)) {
      return {
        appUrl: `vnd.youtube:${trailerKey}`,
        webUrl: `https://www.youtube.com/watch?v=${trailerKey}`,
      };
    }

    const searchQuery = encodeURIComponent(`${title || 'movie'} official trailer`);
    return {
      appUrl: `vnd.youtube:results?search_query=${searchQuery}`,
      webUrl: `https://www.youtube.com/results?search_query=${searchQuery}`,
    };
  },

  /**
   * Opens the official trailer directly in the native YouTube app,
   * or falls back cleanly to the web browser. Never embeds in-app.
   */
  async openTrailer(mediaItem: MediaItem): Promise<void> {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { appUrl, webUrl } = this.getYoutubeUrls(mediaItem.trailerKey, mediaItem.title);

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {
      // Fall through to web
    }

    try {
      await Linking.openURL(webUrl);
    } catch (err) {
      console.warn('Failed to open YouTube trailer:', err);
    }
  },
};
