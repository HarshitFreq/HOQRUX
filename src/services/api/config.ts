/**
 * Centralized API & Credentials Configuration
 * Securely resolves API keys from environment variables
 */

export const API_CONFIG = {
  TMDB: {
    API_KEY: process.env.EXPO_PUBLIC_TMDB_API_KEY || '1cf50e6248dc270629e802686245c2c8',
    BASE_URL: 'https://api.tmdb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  },
  SUPABASE: {
    URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },
} as const;
