# HarborStats Product Roadmap

## Purpose

HarborStats is a trusted, social history of a friend group’s Catan games. It
records outcomes, makes the standings understandable, and turns a sequence of
game nights into useful stories about the players and their rivalries.

This is a product roadmap, not an execution checklist. The work board, audit
ledger, issue tracker, and pull requests own active task status, implementation
notes, validation evidence, and delivery history.

## Operating model

- The **HarborStats Daily App & Documentation Audit Digest** detects concrete
  product and documentation drift. It does not replace this roadmap.
- Update this document when product direction, a material roadmap commitment,
  or shipped product capability changes—not for each implementation subtask.
- Keep delivery work isolated in reviewed pull requests. Documentation-only
  findings may be approved automatically by the daily digest; changes coupled
  to product behavior, runtime, CI, schema, security, or UI remain explicitly
  approval-gated.

## Product principles

1. **Trust the history.** A recorded game, its participants, winner, and
   resulting rating history must remain understandable and auditable.
2. **Explain the standings.** Ratings, rankings, streaks, and rivalry metrics
   should show how they were derived rather than act as opaque scores.
3. **Make game night social.** The product should create useful recaps and
   friendly stories without making game entry burdensome.
4. **Keep data entry thin.** Additional game metadata must be optional and
   justified by valuable analysis or a clear game-night workflow.
5. **Design for the whole roster.** Public views, responsive layouts, and
   accessible interaction are core product requirements, not polish work.

## Shipped capabilities

- Game recording and management with public game history, player profiles,
  aggregate statistics, and an authenticated administrative surface.
- Derived multiplayer Elo ratings, Power Rankings, rating history, provisional
  rating treatment, and explainable chronological replay semantics.
- Rich group analytics, including records, streaks, score and finish analysis,
  Head-to-Head records, rivalry cards, and matchup views.
- Responsive, accessible public stats experiences with tested chart interaction
  and stable player-identity presentation.
- Auditability and delivery safeguards for state-changing actions, database
  integrity, and browser/CI regression coverage.

## Current delivery priority

### Game Detail Recap Pages

Create a public, shareable detail page for a recorded game. A recap should
present the game’s existing public information—date, participants, scores,
winner, relevant notes, rated status, and rating impact when applicable—in a
clear mobile-friendly hierarchy.

The recap is read-only. It must preserve historical rating semantics, provide a
safe direct-link and not-found experience, and never expose data that is not
already public elsewhere in the product.

## Approved next

### Achievements and Trophy Cabinet

Add a derived badge system and a player-facing Trophy Cabinet. The first badge
catalog should reward meaningful participation, performance, improvement,
streaks, and notable rivalries while keeping badges explainable and derived
from recorded game history.

Achievement state should remain derived unless a future product need justifies
persisting unlock moments or notifications.

## Future opportunities

These are product candidates, not approved implementation commitments.

### Seasons and tournaments

Support named seasons with date boundaries, standings, champions, and archived
results. Before delivery, decide whether ratings carry across seasons and
separate that decision from season-specific standings.

### Optional game context and filtered analytics

Optionally capture expansion, map, player count, duration, seat order, or
location only when the group will consistently provide it. Use the data to
answer useful questions without turning game entry into administration.

### HarborStats Wrapped

Provide a year-selectable recap of the group: player and improvement stories,
notable games, streaks, total activity, and concise superlatives. It should
build on the same transparent historical data as stats and ratings.

### Achievement history and notifications

Consider persisted unlock timestamps, "newly unlocked" moments, or
notifications only after the derived Trophy Cabinet demonstrates sustained
value and the privacy/notification model is defined.

## Deliberate constraints

- Ratings remain replay-derived from chronological eligible games; do not
  replace the history with opaque mutable totals.
- Multiplayer results must preserve explicit winners, score ties, and
  provisional-rating behavior accurately.
- New features must not weaken game-data validation, audit coverage, or public
  accessibility.
- A daily audit finding is evidence for roadmap maintenance, not an automatic
  product commitment unless it is explicitly approved.
