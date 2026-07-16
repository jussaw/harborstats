# HarborStats Growth Roadmap — Ratings, New Stats, Achievements

## Context

HarborStats is a Catan recorder + stats dashboard for a friend group. Raw data is intentionally
thin — per game: a date, free-text notes, and a set of `(player, score 0–30, winner)` rows;
players carry a single `premium`/`standard` tier. The app already ships ~40 stat cards across 6
sections.

This roadmap adds three features **without changing the data model or how games are entered** —
everything is derived from the existing `games` / `game_players` / `players` tables. Delivered as
three independent, shippable phases.

**Locked decisions:** phased roadmap · multiplayer Elo (transparent/explainable) · pure-derived
badges (no persistence).

## Conventions to Reuse (applies to all phases)

- [ ] Server stats go in `web/lib/stats.ts`; new **pure** engines (rating, achievements) get
      their own `web/lib/` modules so they're unit-testable in isolation.
- [ ] Wire cards in `web/app/stats/page.tsx` (`Promise.all` + grouped render); declare sections
      in `web/lib/stats-sections.ts`.
- [ ] Reuse `rankWithTies` (`web/lib/rank.ts`) for leaderboard `#` columns.
- [ ] Reuse existing loaders — `getGameSizeAggregateData`, `getOrderedGameOutcomeData`,
      `getPlayerHeadToHeadRecords`, `getPlayerWinRateByGameSize`, `getPlayerMarginStats`,
      `getSingleGameRecords` — instead of re-querying.
- [ ] Reuse UI: `StatsCard`, `StatsLeaderboardTable`, `RivalryCard`, and `components/ui/`
      primitives (`Card`, `Badge`, `Button`).
- [ ] Follow "Elevated Harbor" guardrails: semantic tokens only (no inline hex), **Cinzel on
      titles/headings only**, hand-rolled SVG charts modeled on `CumulativeGamesAreaChart.tsx`.
- [ ] Keep existing stats section anchor IDs stable (e2e + sidebar depend on them); new IDs OK.
- [ ] Use a sensible hard-coded min-games gate (e.g., 5) matching the score-distribution
      precedent in `app/stats/page.tsx`.
- [ ] Add no new dependencies (`web/AGENTS.md`); the optional share-image uses Next's built-in
      `ImageResponse`.

---

## Phase 1 — New Stat Cards (quick wins, self-contained) ✅ COMPLETE

- [x] **Consistency rating** — per-player score std-dev (SQL `STDDEV_SAMP`, min 5 games); ascending
      = "most consistent." → Scoring section.
- [x] **Dominance index** — avg of `playerScore / sum(scores in that game)` per player. → Scoring.
- [x] **Nail-biter record** — games where `winnerScore − runnerUpScore ≤ 2`; per-player nail-biter
      appearances + win rate (reuse margin logic). → Finishes & Tiers.
- [x] **Clutch factor** — win rate at full tables (5–6P) vs small (3–4P), reusing
      `getPlayerWinRateByGameSize` buckets; show big-table rate + delta. → Finishes & Tiers.
- [x] **Kingmaker** — when player X loses, which opponent wins most often *above* the 1/(N−1)
      baseline (in-memory over `getOrderedGameOutcomeData`). → Head-to-Head.
- [x] Render all 5 cards in `web/app/stats/page.tsx`.
- [x] Unit tests in `web/tests/unit/` covering each stat's math on small datasets.

**Files:** modify `web/lib/stats.ts`, `web/app/stats/page.tsx` (+ `stats-sections.ts` if adding
subsection anchors); new `web/tests/unit/stats-*.test.ts`.

---

## Phase 2 — Multiplayer Elo Skill Rating

- [x] Build pure engine `web/lib/rating.ts`:
  - [x] Base `1500`, scale `400`, fixed `K = 24` (including provisional players).
  - [x] Process games in `played_at` then `id` order; explicit winner takes precedence and non-winners compare by score.
  - [x] Expand each game to all unordered pairs; `S = 1 / 0 / 0.5` (ahead / behind / equal score &
        not the explicit winner); `E_i = 1/(1+10^((R_j−R_i)/400))`; accumulate
        `Δ_i += (K/(N−1))·(S_i−E_i)` and apply **after** the game (simultaneous update).
  - [x] Flag players as **provisional** under 5 rated multiplayer games.
  - [x] Output current rating, peak, last-game change, games count, provisional flag, and replayable history.
- [x] Add a server loader that pulls all eligible games chronologically and runs the replay.
- [x] **Power Ranking** leaderboard card (Elo sort, `rankWithTies`, signed change, provisional mark).
- [x] Create new **Ratings** section in `web/lib/stats-sections.ts` (id `ratings`) + sidebar anchor.
- [x] **Rating-over-time** chart — new `web/components/RatingHistoryChart.tsx` (multi-line SVG).
- [ ] **Quality of Wins** card — avg opponent rating (at time of game) among games won.
- [ ] Show current rating on player profile (`web/components/PlayersSection.tsx`).
- [ ] Unit tests `web/tests/unit/rating.test.ts` with a hand-verified progression (incl. a
      provisional player and a score-tie → 0.5/0.5); component test for the chart.

**Files:** new `web/lib/rating.ts`, `web/components/RatingHistoryChart.tsx`; modify
`web/lib/stats-sections.ts`, `web/app/stats/page.tsx`, `web/components/PlayersSection.tsx`,
`web/components/StatsSidebarSections.tsx`.

---

## Phase 3 — Achievements (Trophy Cabinet) + "HarborStats Wrapped"

- [ ] Build pure engine `web/lib/achievements.ts` returning earned badges per player, each
      `{ id, name, description, icon, rarity, earned }` with a predicate.
- [ ] Implement the starter badge catalog (~12): First Win · Century Club (100 VP) · Double
      Century (200) · Hat-Trick (3 in a row) · On Fire (5 in a row) · Perfect Month · Giant-Slayer
      (beat top-rated player) · Bridesmaid (≥5 seconds) · Iron Man (longest attendance streak) ·
      Table-Setter (top dominance) · Mr. Reliable (lowest std-dev) · Peak (reached #1 rating).
- [ ] **Trophy Cabinet** component `web/components/TrophyCabinet.tsx` (earned = gold, locked =
      greyed); mount in `PlayersSection.tsx`.
- [ ] **"HarborStats Wrapped"** recap route `web/app/wrapped/page.tsx` (server component), default
      current year, year selectable via search param — Player of the Year, Most Improved (Elo
      gain), biggest blowout, longest streak, total games, fun superlatives.
- [ ] Add a sidebar nav entry for Wrapped (`web/components/Sidebar.tsx`).
- [ ] **Stretch:** shareable PNG via Next `ImageResponse` (`web/app/wrapped/opengraph-image.tsx`),
      no new dependency.
- [ ] Unit tests `web/tests/unit/achievements.test.ts` (fixtures that do/don't trip each
      predicate); component test for `TrophyCabinet`.

**Files:** new `web/lib/achievements.ts`, `web/components/TrophyCabinet.tsx`,
`web/app/wrapped/page.tsx`; modify `web/components/PlayersSection.tsx`, `web/components/Sidebar.tsx`.

> Visual design (Power Ranking layout, chart styling, badge art, Wrapped page) is iterated with
> rendered mockups during implementation.

---

## Verification (per phase, run from `web/`)

- [ ] `pnpm test` — unit + component tests pass (pure engines covered by hand-verified fixtures).
- [ ] `pnpm lint` clean.
- [ ] `pnpm build` succeeds.
- [ ] Manual smoke (`pnpm dev`): `/stats` shows the new cards + Ratings section; player profile
      shows current rating + trophy cabinet; `/wrapped` renders; existing anchors/sidebar intact.
- [ ] Run `pnpm test:e2e` only if a change alters existing `/stats` anchor contracts.

## Out of Scope (deferred — would need schema/data-entry changes)

- [ ] Seasons / tournaments
- [ ] Seat-order / map / location capture
- [ ] Per-game detail pages
- [ ] Persisted achievement timestamps + "newly unlocked" push notifications
