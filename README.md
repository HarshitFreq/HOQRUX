# Hoqrux — Film & TV Tracker App

A clean, dark-mode app for tracking movies, TV series, and anime, plus finding what to watch next.

I built Hoqrux because most tracking apps feel cluttered with social feeds, ads, and noise. This is just a fast, pitch-black space to log episodes, keep watchlists, check when new seasons air, and write quick notes for yourself.

Works on iOS, Android, and the web (as an installable PWA).

---

## What it does

- **Track what you watch**: Mark movies as watched, log TV/anime episode by episode, and see season progress at a glance.
- **Release radar**: Check upcoming episode air dates and countdowns for the shows you follow.
- **Recommendations & search**: Browse by genre, check TMDB and IMDb ratings side by side, and see where titles are streaming.
- **Watchlists & notes**: Organize titles into Watching, Want to Watch, Completed, or your own custom lists, with private notes that stay yours.
- **Local-first with optional sync**: Everything saves locally on your device right away, and syncs to Supabase in the background if you sign in.

---

## Stack

- **App**: React Native 0.88 + Expo SDK 58 + Expo Router
- **Language**: TypeScript
- **Local storage**: AsyncStorage
- **Cloud sync & auth**: Supabase (Postgres + RLS)
- **Movie & TV data**: TMDB API

---

## Folder layout

```text
src/
├── app/                 # Screens and tabs (Now, Explore, Lists, Profile, Welcome, Radar)
│   ├── (tabs)/          # Main bottom/floating tab screens
│   └── title/[id].tsx   # Title details, episode tracker, ratings & notes
├── components/          # Shared UI components
├── context/             # Auth and tracking state
├── services/            # TMDB client, local storage, Supabase sync & schema.sql
└── theme/               # Colors and fonts
```

---

## Running it locally

You'll need Node.js 18+ and a free TMDB API key. Supabase is optional (only needed if you want cloud sync across devices).

1. Clone the repo and install packages:
   ```bash
   git clone https://github.com/HarshitFreq/HOQRUX.git
   cd HOQRUX
   npm install
   ```

2. Set up your `.env` file:
   ```bash
   cp .env.example .env
   ```
   Add your keys:
   ```env
   EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. *(Optional)* If you're using Supabase for sync, run `src/services/db/schema.sql` in the Supabase SQL Editor to set up the `profiles`, `user_tracking`, `user_watchlists`, and `user_history` tables.

4. Start Expo:
   ```bash
   npx expo start
   ```
   From there you can open it on Android, iOS, or press `w` for web.

---

## Useful commands

```bash
npx tsc --noEmit          # Typecheck
npx expo lint             # Lint
npx expo start --web      # Run web / PWA locally
```

---

## License

MIT
