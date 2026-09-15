# Roadmap

What the app does not do yet, with enough context to pick any item up without
repeating the analysis. Each entry says what problem it solves, which files it
touches, what already exists to build on, roughly how big it is, and what is
still undecided.

Effort is in focused days for someone who knows this codebase.

---

## Medium term

### Tournament mode
**Problem.** Matches are one-off. A group playing an evening keeps the bracket
on paper.
**Touches.** New `src/components/tournament/`, a `tournament` document type in
`db/`, a route next to `/offline`.
**Exists.** `MatchSetup`'s line-up (`useLineup`) already produces an ordered
list of players; `useGameEngine` takes a player list and a `GameConfig` and
reports a winner, which is all a bracket needs between rounds. `MatchHistory`
rows can carry a tournament id in `data` without a schema change.
**Effort.** 3–4 days for single elimination with a bracket view; double
elimination and group stages roughly double it.
**Open.** Whether a tournament survives a reload (a document per tournament) or
lives only in memory for the evening. Whether bots may enter.

### Cricket, Around the Clock, Shanghai
**Problem.** Only X01 and the three training modes exist. Cricket is the second
most played game in a pub.
**Touches.** `useGameEngine` is X01-shaped (`currentScore`, bust rules,
checkouts). Cricket needs its own engine; the shared parts are the input
(`Keypad`, dart entry), the scoreboard shell and the match-saving path.
**Exists.** `PowerScoring` and `SplitScore` show the pattern for a
self-contained mode with its own rules that still saves a `MatchHistory` with
`gameType`. `segmentHits` on `PlayerStats` already records what was hit where,
which is exactly Cricket's currency.
**Effort.** 2–3 days for Cricket, ~1 day each for Around the Clock and Shanghai
on top of it.
**Open.** Whether Cricket rounds count towards the same averages (they should
not) and how the stats screen groups modes it has no averages for.

### Bot personalities
**Problem.** One bot dial (`targetAverage`) produces an opponent that is
accurate but characterless — it never has a bad leg or a favourite double.
**Touches.** `src/utils/bot.ts` (87 % covered, tests in
`utils/__tests__/bot.test.ts`), the bot fields on `Profile`, the bot section of
`CreateProfileCard`.
**Exists.** `getBotDart` already models aim, scatter and a target choice per
score; personalities are weights on what is there — a checkout specialist has a
tighter double, a scorer a tighter treble, a streaky player a per-leg accuracy
offset.
**Effort.** 1–2 days including the simulation harness to calibrate them (the
existing tests already simulate whole legs).
**Open.** Whether personalities are presets or sliders, and whether a
personality changes the displayed "average" the bot is labelled with.

### Leg replay
**Problem.** A finished match can be looked at but not watched. "How did I lose
that leg" has no answer beyond the averages.
**Touches.** `MatchHistory` would need the dart sequence per leg; today only
per-leg averages (`legHistory`) and aggregate `segmentHits` are stored.
**Exists.** `useGameEngine` already keeps a full undo history of states during
the match — a replay is that history, kept instead of discarded. The heatmap
component can render a leg's darts as-is.
**Effort.** 2 days, most of it deciding the storage format.
**Open.** Size: a 40-dart leg as a compact array of `[segment, multiplier]`
pairs is small, but the naive "store the state history" is not. Old matches will
never have it, so every view needs the empty case.

### Training goals and streaks
**Problem.** Training records numbers but sets no targets, so there is nothing
to come back for.
**Touches.** `TrainingHub`, `Profile` (a `goals` field), the three training
components' finish handlers.
**Exists.** Every training mode already reports a score and darts used, and the
profile already accumulates per-mode aggregates (`powerScoring`, `splitScore`,
`checkoutTraining`).
**Effort.** 1–2 days.
**Open.** Whether goals are per profile or per device, and whether a missed day
breaks a streak (calendar-based state needs a stored "last played" date, which
`createdAt` on matches now makes reliable).

### Online reconnect
**Problem.** A player whose tab reloads or loses the network mid-match cannot
get back in. The others see the 60-second host countdown (`DisconnectOverlay`)
and the match ends; a guest who drops is simply gone.
**Touches.** `useOnlineStore` (rejoin with the stored seat id), `OnlineGameWrapper`
(resync the state from the host), `DisconnectOverlay` (a banner above the
keypad instead of a blocking dialog, as sketched in design draft F4).
**Exists.** The seat id already survives a reload in `sessionStorage`
(`dart_online_seat_id`), and the host already broadcasts full game states.
**Effort.** 2–3 days, mostly testing on two devices.
**Open.** How long a room stays open after the host leaves (the draft suggests
30 minutes), and what a guest sees while the host is the one reconnecting.

### Eight players
**Problem.** Pub nights and club evenings have more than four people at a board;
today the setup stops at four, and 2v2 is the only team format.
**Touches.** `useMatchSetupConfig` (player count bound), `PlayerSelection`,
`Scoreboard` grid (`--sb-cols`/`--sb-rows`), `playerColors` (four colours),
bull-off order, online roster limit (`MAX_ONLINE_PLAYERS` in `LobbyRoom`).
**Exists.** The engine loops over `players` without a fixed count; only the UI
and the palette assume four.
**Effort.** 2 days, most of it the score cards at phone width.
**Open.** Four more player colours that stay distinct on felt, and whether 4v4 is
wanted or only free-for-all.

### Six-character room codes
**Problem.** Four characters from a 32-letter alphabet (no I, O, 0, 1) give about
a million codes, fine today, but short enough to guess a public room by trying.
**Touches.** `generateRoomCode` and `isRoomCodeFree` in `useOnlineStore`,
`CodeInput` (`ROOM_CODE_LENGTH`), the share text in `LobbyRoom`.
**Exists.** Code length is one constant on the input side; the store already
retries on collision.
**Effort.** Half a day.
**Open.** Whether rooms opened by an older client (four characters) must stay
joinable during the switch.

### Throwing hand
**Problem.** Heatmap and radar read differently for left- and right-handed
players (the natural miss drifts to the other side), and nothing records it.
**Touches.** `Profile` (a `hand` field), `CreateProfileCard`, `ProfileList`,
optionally the heatmap caption.
**Exists.** Profiles already carry optional per-player settings (`color`,
`targetAverage`) and sync through backups.
**Effort.** Half a day for the field, more if the statistics should use it.
**Open.** Whether it changes anything beyond a label.

### New training drills
**Problem.** Three drills cover scoring, splitting and finishing; doubles-only
practice (Round the Clock on doubles, Bob’s 27) and a timed 121 are missing.
**Touches.** A component per drill like `CheckoutTraining`, `TrainingHub`
(`MODE_CARDS`), `MatchHistory.gameType`, `playerStats` (`TRAINING_LABELS`),
the story export.
**Exists.** Since v2.0.0 every drill runs inside `MatchShell` with the shared
keypad and celebration stage, and statistics filter by `gameType`.
**Effort.** 1–2 days per drill.
**Open.** Which drills first; whether they share the Cricket work above.

---

## Long term

### Camera auto-scoring
**Problem.** Entering darts by hand is the whole friction of a scoreboard app.
**Touches.** Everything at the input boundary: a new source alongside `Keypad`,
feeding the same `addDart(base, mult)`.
**Exists.** The engine's input surface is exactly two numbers per dart, so a
camera source needs no engine changes. `getBotDart`'s board model
(`BOARD_NEIGHBORS`, `segmentAtOffset`) is a usable mapping from position to
segment.
**Effort.** Weeks, and mostly not app work: calibration UI, a model, and a
correction flow for when it is wrong.
**Open.** Whether to do it in-browser (WebRTC + a small model) or lean on an
existing service. Accuracy below ~98 % is worse than typing.

### Voice input
**Problem.** Hands are holding darts.
**Touches.** A source next to the keypad, same `addDart` boundary.
**Exists.** `utils/audio.ts` already speaks scores through
`speechSynthesis`; the Web Speech API's recognition half is the mirror of it.
**Effort.** 2–3 days for German numbers plus "no score" and "double".
**Open.** Recognition support is uneven across browsers and needs a network
round trip in most of them. Pub noise is the real test.

### Leaderboards and friends
**Problem.** Statistics stop at the device. Comparing means sitting next to each
other.
**Touches.** New tables (accounts are per-user documents today, with row-level
security that deliberately scopes everything to its owner), a friends list, an
opt-in flag per profile.
**Exists.** The guest-sync protocol already solves the hard half: proving that
a statistic belongs to an account, server-side. `HeadToHead` already compares
two profiles locally.
**Effort.** 4–5 days, most of it schema and policies rather than UI.
**Open.** Privacy: what is visible to whom by default (nothing, presumably), and
whether averages from guest sessions on other people's devices count.

---

## Deliberately not done

**Stripping `console.*` from production builds.** The plan called for it. All 39
calls turned out to be `console.error`/`console.warn` in catch blocks, each next
to a user-visible message from the notification store. They are what a bug
report is reconstructed from; removing them buys a few bytes and costs the only
diagnostic trail there is.

**Merging the remaining ad-hoc CSS breakpoints.** `src/index.css` documents a
named scale, and the 601px outlier was folded into 600px. Four widths are still
off it — 360, 420, 500 and 560 — and each one moves a layout at a real device
width. They need a browser and an eye, not a search-and-replace.

**Reducing the remaining `!important` declarations.** Most of the 120 lived in the
two theme stylesheets, which v2.0.0 removed together with the themes. 25 are left
in `src/index.css`; look at them when that file is split further, not on their
own.

**A generic `Modal` component.** v2.0.0 settled on two shapes, `Sheet` (from the
bottom) and `Dialog` (a question in the middle), both on `useModalA11y`.
`ConfirmModal` remains for a few older confirmations; folding it into `Dialog`
is a small follow-up, not a reason for a third wrapper.
