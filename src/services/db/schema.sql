-- ==============================================================================
-- HOQRUX Swiss Brutalist Database Schema (Supabase PostgreSQL + RLS)
-- Supports Local-First multi-accounts, Supabase Auth UUIDs, & Cross-Device Sync
-- ==============================================================================

-- Safely drop existing empty tables and constraints to upgrade user_id from UUID to TEXT
DROP TABLE IF EXISTS public.user_history CASCADE;
DROP TABLE IF EXISTS public.user_watchlists CASCADE;
DROP TABLE IF EXISTS public.user_tracking CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles Table (Supports both Supabase Auth UUID and Local User IDs)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. User Title Tracking Table (Individual watch states, ratings, episode ticks)
CREATE TABLE public.user_tracking (
  user_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  status TEXT NOT NULL,
  rating NUMERIC(3, 1),
  is_favorite BOOLEAN DEFAULT FALSE,
  reminder_set BOOLEAN DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, title_id)
);

-- 3. User Watchlists Table (Custom and system lists per user)
CREATE TABLE public.user_watchlists (
  user_id TEXT NOT NULL,
  list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  accent_color TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, list_id)
);

-- 4. User Viewing History Table (Chronological log entries per user)
CREATE TABLE public.user_history (
  user_id TEXT NOT NULL,
  history_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  watched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, history_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_tracking_user ON public.user_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON public.user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON public.user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_watched ON public.user_history(user_id, watched_at DESC);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- Supports publishable API key (anon) and authenticated JWT sessions
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow all access to profiles" ON public.profiles
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Tracking Policies
CREATE POLICY "Allow all access to user_tracking" ON public.user_tracking
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Watchlists Policies
CREATE POLICY "Allow all access to user_watchlists" ON public.user_watchlists
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- History Policies
CREATE POLICY "Allow all access to user_history" ON public.user_history
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- Auto-create profile trigger on Supabase Auth SignUp (Optional sync hook)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id::text,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      username = EXCLUDED.username,
      updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
