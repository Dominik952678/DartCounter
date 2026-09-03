# Dartcounter Pro

A dart scoreboard for X01, training modes and online matches, with per-player
statistics that survive the match. React + TypeScript + Vite, Supabase for
accounts and sync, installable as a PWA.

The app is German-facing; the code and its comments are English.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173, also on the LAN (--host)
```

Without configuration the app talks to the production Supabase project and
works offline as a guest — profiles and matches then live in this browser only.

### Pointing at your own Supabase project

Copy `.env.example` to `.env` and fill in the two values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=sb_publishable_your_key
```

The key is the *publishable* one. It is meant to reach the browser; row-level
security is what protects the data (see below).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-checks the project references, then builds to `dist/` |
| `npm run preview` | Serves the built app |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with a v8 coverage report |
| `npm run typecheck` | `tsc -b --noEmit` over the project references |
| `npm run lint` | ESLint over the repo |
| `npm run ci` | typecheck → lint → tests → build; the gate every change passes |

## Supabase

One table carries everything:

```
public.documents (id text primary key, data jsonb, owner_id uuid)
```

Row ids encode what they hold and whom they belong to:

| Id pattern | Content |
|---|---|
| `profiles_<userId>` | that account's profile map |
| `match_<userId>_<timestamp>` | one finished match |
| `user_sync_<userId>` | the account's guest-sync token document |
| `sync_code_<code>` | lookup row for redeeming a six-digit code |

`supabase/migrations/0001_documents_rls.sql` sets up ownership and row-level
security, and moves the four cross-account guest-sync writes behind
`SECURITY DEFINER` functions — `redeem_sync_code`, `set_guest_live_match`,
`guest_sync_status` and `sync_guest_match_result` — so the token check that
guards a guest's statistics runs on the server rather than in the browser.
Apply it once via the SQL editor or `supabase db push`; it is idempotent.

Realtime is used for two things: the online match channel (`room_<code>`) and
the live view of one's own sync document.

## Deployment

Static hosting; `netlify.toml`, `vercel.json` and `public/_redirects` are set up
to serve `index.html` for every route. The service worker (`vite-plugin-pwa`,
`registerType: 'autoUpdate'`) precaches the build, so a deploy reaches an
installed app on its next start. The version badge in the app offers a reload
that picks up a new build immediately.

Fonts are bundled, not fetched from a CDN — no third-party request when the app
is opened.

## Where things are

```
src/
  components/          screens; the big ones have a folder of their own parts
    matchSetup/        the match configuration screen, split up
    profile/           the profile screen, split up
  db/                  Supabase client, profiles, matches, guest sync
  hooks/               game engine, profiles, modal accessibility
  store/               zustand: auth, theme, online room, notifications
  utils/               bot, checkouts, storage registry, audio, haptics
  styles/              the two alternative themes
```

`docs/ARCHITECTURE.md` explains how they fit together;
`docs/ROADMAP.md` holds what is deliberately not built yet.
