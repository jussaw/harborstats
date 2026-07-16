# HarborStats Domain Glossary

The shared, precise vocabulary for HarborStats. Terms only — no implementation
details. When code and this glossary disagree, one of them is wrong; reconcile
before continuing.

## Ratings

- **Rated Game** — a recorded multiplayer game that counts toward Elo: two or
  more participants with exactly one winner. Solo games and games without a
  winner are never rated.

- **Sequence** — the shared, zero-based index of a Rated Game in chronological
  order. Every player's Rating History is plotted against the same Sequence
  axis, so one Sequence position means the same game for everyone.

- **Rating Snapshot** — a player's Elo rating immediately after a particular
  Rated Game, together with the change that game produced.

- **Carried-forward Snapshot** — the Rating Snapshot recorded for a player who
  sat out a Rated Game: their rating is unchanged and the change is zero. It
  exists so that every player who has debuted stays present at every later
  Sequence.

- **Provisional Rating** — a player's rating while they have played fewer than
  five Rated Games. Once they reach their fifth played game the rating is
  considered established. Carried-forward games do not count toward this total.

- **Power Ranking** — the current standings: every player ordered by their
  latest Elo rating.

- **Rating History** — the full series of Rating Snapshots for the players in
  view, read as lines over the Sequence axis.

- **Cohort Filter** — the page-wide player selection that decides which players
  are included in the statistics. Changing it re-runs the Elo replay, so it can
  change the ratings themselves (a player's rating depends only on games against
  players in the cohort).

- **Line Visibility** — a purely visual toggle (from the Rating History legend)
  that shows or hides a single player's line. It never changes any rating and
  never rescales the axis; it only removes that line from the drawing and the
  crosshair tooltip. Contrast with the Cohort Filter, which does change ratings.
