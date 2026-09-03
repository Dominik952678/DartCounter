# Architecture

How the pieces fit, and why they are shaped the way they are. For setup and
scripts see the README; for what is deliberately not built yet, `ROADMAP.md`.

## The shape of a match

```
MatchSetup ──startGame──▶ useGameEngine ──▶ GameScreen / Scoreboard
                              │
                              ├─ auto-save (debounced) ──▶ storage: savedGame
                              │
                              └─ match over ──▶ StatsModal
                                                   │
                                    ┌──────────────┴───────────────┐
                                    ▼                              ▼
                         applyProfiles(next)               saveMatch(match)
                            (useProfiles)                    (db/matches)
                                    │                              │
                                    ▼                              ▼
                       localStorage + documents        localStorage + documents
```

`useGameEngine` owns the whole rulebook: throws, busts, checkouts, the 2v2
freeze rule, the bot, sets and legs. It keeps its state in one `GameState`
object plus an undo history, and reports upwards through callbacks rather than
reading anything global.

Two things about that history are load-bearing. Each entry is a deep clone of
the whole state, so it is capped — 50 entries in memory, 5 in the saved game —
and the auto-save is debounced. Uncapped, a long match wrote a quadratically
growing blob on every dart and eventually hit the storage quota, at which point
resuming silently stopped working.

## Profiles, and the one path that writes them

`useProfiles` is the only writer. `applyProfiles(next)` sets state and persists
the same object, and its function form resolves against a synchronously written
mirror so consecutive calls in one tick compose.

Nothing else may call `saveProfiles` for the signed-in user. The rule exists
because the old code computed the next profile set inside a `setProfiles`
updater and then persisted the variable that updater had assigned — a value
React is under no obligation to have produced yet. When it had not, the account
was saved as `undefined`.

Profile statistics are accumulated per match as matches are played.
`reconstructAllProfilesFromMatches` recomputes them from the full history and is
a repair path, not the normal one: it only runs when every match is loaded,
because a partial window would book fewer matches than the profile already has.

## Persistence

```
src/db/
  supabase.ts    client + PersistenceError
  localCache.ts  the browser-cache keys that belong to an account
  matches.ts     match records: dates, winners, saving, paging
  profiles.ts    profiles, reconstruction, booking a match onto a profile
  guestSync.ts   the sync-code protocol
  index.ts       the barrel every caller imports from
```

They depend downwards only, in that order.

Every write goes to localStorage first and to Supabase second, and a failure of
either throws `PersistenceError` — with a `scope` saying which half failed —
which callers report through the notification store. Silent `console.error` on
a failed write is what let a player finish a 40-minute match and be shown full
statistics for data that no longer existed anywhere.

Matches are read a page at a time (`getMatchPage`, 100 rows plus the total
count). Only the stats screen, whose numbers are lifetime aggregates, asks for
all of them.

Dates: `createdAt` is ISO and sortable; the `date` field next to it is a
localised display string and nothing may sort or filter on it. Older matches get
`createdAt` derived on read from their document id, then from the German display
format, and are left undated rather than stamped with a made-up time.

## Storage keys

`src/utils/storage.ts` is the registry for everything this device keeps:
theme and sound, the last match configuration, the match in progress, the
online display name. Typed reads that cannot fail — `readInt` with bounds,
`readOneOf` against the allowed set, `readJson` which discards a corrupt value —
and writes that report whether the value actually landed, so the auto-save can
tell the player when the quota refused it.

Account data is keyed by user id and stays with the persistence layer, in
`db/localCache.ts`. Signing out clears exactly those keys and leaves the device
preferences alone.

## Online matches

One Supabase realtime channel per room, `room_<code>`, with the host
authoritative:

```
guest                        host
  │  client_throw {seatId} ───▶ verify seat is on throw ──▶ engine.addDart
  │                             │
  │  ◀─── state_update {seq} ───┘  (every state change, plus on request)
  └─ drop anything with seq ≤ the last applied
```

The host owns the game; guests render what they are sent. Two rules make that
safe: a command is applied only if its `seatId` is the seat that is on throw —
the check used to live in the sending client's own button handler, where
anything on the channel could score for somebody else — and every `state_update`
carries a monotonic `seq`, because broadcasts have no ordering guarantee and a
late arrival used to roll the board back.

Seats are identified by a per-tab id from `sessionStorage`, not by the account:
the same account may sit at two boards, and two players may pick the same
display name.

Room codes are four characters from a 32-symbol alphabet. `createRoom` probes
up to five of them via presence and takes the first nobody is sitting on;
without that, two hosts could share a channel, each seeing the other's players.

## Guest sync

A player without their own device plays on somebody else's and still gets their
own statistics.

```
guest device                     cloud                    host device
  generateUserSyncCode ──▶ user_sync_<id> + sync_code_<code>
                                   │
                                   ◀──── redeem_sync_code(code, hostId) ────
                                   │       (server validates and couples)
                                   │
  live match banner  ◀──── set_guest_live_match ◀──── match starts
  revokeHostAccess   ────▶         │
                                   ▼
                          sync_guest_match_result(token) ◀── match ends
```

The token check is a `SECURITY DEFINER` function in the database. It used to run
in the browser, where anyone could skip it with devtools and wash their
statistics. A profile can be coupled to at most one host device at a time, and
the guest can cut the link — or abort the running match — from their own device.

## State that is not React state

Four zustand stores, each with one job: `useAuthStore` (session),
`useThemeStore` (skin and its effects), `useOnlineStore` (room channel, roster,
event registry) and `useNotificationStore` (what the user is told about
failures).

## Rendering and the bundle

`StatsPage` and `ProfileTab` are lazy: they are the only routes that reach
recharts, and through the profile screen html2canvas. That keeps roughly 400 kB
of charting and 200 kB of image export off the first paint. recharts is
deliberately *not* given a named chunk — naming one made the bundler park Vite's
preload helper inside it, and the entry's import of that helper pulled the whole
library back into the initial load.
