# HOQRUX

**Swiss Brutalist Media Tracker // Local-First Personal Logbook**

A high-performance, distraction-free logbook for tracking films and television series with instant local storage and silent background cloud synchronization.

---

## Features

- **Swiss Brutalist Interface**: Void-black background (`#050507`), crisp 1px borders, high-contrast monospace & grotesque typography, with zero unnecessary decorative filler.
- **Local-First Architecture**: Instant writes, zero latency, offline-ready with persistent local storage.
- **Automatic Background Cloud Sync**: Replicates tracking records, watchlists, and viewing logs to Supabase PostgreSQL automatically whenever items are logged or updated.
- **Deep Episode & Season Progress**: Track television shows episode-by-episode with progress indicators, season completion checks, and next episode airdate tracking.
- **Viewing Analytics**: Track watch time, episodes completed, feature films logged, average ratings, and genre distributions.
- **Custom & System Watchlists**: Manage Watching, Plan to Watch, Completed collections alongside user-defined custom watchlists.

---

## Tech Stack

- **Framework**: React Native 0.88 + Expo SDK 58
- **Navigation**: Expo Router v5 (file-based routing)
- **Language**: TypeScript (strict mode)
- **Local Storage**: AsyncStorage
- **Cloud Database**: Supabase (PostgreSQL with Row-Level Security)
- **Metadata Provider**: TMDB API v3

---

## Project Structure

```
src/
├── app/                 # Expo Router file-based screens and tabs
│   ├── (tabs)/          # Main tab navigators (Now, Explore, Lists, Profile)
│   ├── title/[id].tsx   # Media detail and episode tracking screen
│   └── _layout.tsx      # Global provider wraps and root stack
├── components/          # Brutalist UI components
├── context/             # Global React state (AuthContext, TrackingContext)
├── services/            # API clients, local storage, and database services
│   ├── api/config.ts    # Centralized environment variable resolver
│   ├── database.ts      # Bidirectional local-first and cloud synchronization
│   ├── supabase.ts      # Supabase client singleton
│   ├── tmdb.ts          # Media metadata client
│   └── db/schema.sql    # PostgreSQL schema and RLS policies
└── theme/               # Color system and typography definitions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Expo Go on a mobile device or an iOS/Android emulator

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HarshitFreq/HOQRUX.git
   cd HOQRUX
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   ```env
   EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Database Setup (Optional):
   To enable cross-device cloud sync, run the SQL script in `src/services/db/schema.sql` inside your Supabase project's SQL Editor.

5. Start the development server:
   ```bash
   npx expo start
   ```

---

## Database Schema

The backend uses four normalized PostgreSQL tables with Row-Level Security (RLS):

- `profiles`: User account credentials, email, and preferences.
- `user_tracking`: Current watch status, ratings, favorite status, and episode completion progress.
- `user_watchlists`: System and custom watchlist definitions and title associations.
- `user_history`: Chronological viewing logs with timestamps.

The complete schema migration script is available in `src/services/db/schema.sql`.

---

## Verification & Scripts

```bash
# Typecheck
npx tsc --noEmit

# Lint
npx expo lint

# Start with target platform
npx expo start --android
npx expo start --ios
```

---

## License

This project is open-source under the MIT License.
