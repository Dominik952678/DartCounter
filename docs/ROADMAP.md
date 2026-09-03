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

**Reducing the 120 `!important` declarations.** They are concentrated in the two
theme stylesheets, which override the base sheet by design. Removing them means
restructuring specificity across three files; worth doing when the theme layer
is next touched, not on its own.

**A generic `Modal` component.** `ConfirmModal` and the bottom-sheet result
dialog share `useModalA11y` but nothing else: one is a question, the other a
sheet with its own animation and layout. A common wrapper would be an
abstraction over two things that differ in everything but their focus trap.
