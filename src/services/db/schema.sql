-- ==============================================================================
-- HOQRUX User-Specific Database Schema (PostgreSQL + Supabase RLS)
-- ==============================================================================

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. User Title Tracking Table (Individual watch states, ratings, episode ticks)
CREATE TABLE IF NOT EXISTS public.user_tracking (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
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
CREATE TABLE IF NOT EXISTS public.user_watchlists (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  accent_color TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, list_id)
);

-- 4. User Viewing History Table (Chronological log entries per user)
CREATE TABLE IF NOT EXISTS public.user_history (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  history_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  watched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, history_id)
);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- Users can only ever read, insert, update, and delete their own rows
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Tracking Policies
CREATE POLICY "Users can view own tracking" ON public.user_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking" ON public.user_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracking" ON public.user_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracking" ON public.user_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- Watchlists Policies
CREATE POLICY "Users can view own watchlists" ON public.user_watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlists" ON public.user_watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists" ON public.user_watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists" ON public.user_watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- History Policies
CREATE POLICY "Users can view own history" ON public.user_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.user_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history" ON public.user_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" ON public.user_history
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- Auto-create profile trigger on Supabase Auth SignUp
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
