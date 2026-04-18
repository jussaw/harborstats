# Implicit Winner on Game Submission

**Date:** 2026-04-18

## Summary

When a game is submitted without any player explicitly marked as the winner, the player with the highest score is automatically set as the winner. If two or more players tie for the highest score, no implicit winner is assigned.

## Change

`parseGameFormData` in `web/lib/games.ts` gains a post-processing step applied after the `players` array is built:

1. Check whether any player has `isWinner === true`.
2. If none do, find the maximum score across all players.
3. If exactly one player holds that maximum, set their `isWinner` to `true`.
4. If multiple players share the maximum (tie), leave all `isWinner` as `false`.

## Scope

- **One function changed:** `parseGameFormData` in `web/lib/games.ts`
- **Both paths covered:** `createGameAction` (`app/actions.ts`) and `updateGameAction` (`app/admin/games/actions.ts`) both call `parseGameFormData`, so no further changes are needed.
- **No schema changes**, no UI changes, no client-side logic.

## Edge Cases

| Scenario | Outcome |
|---|---|
| One explicit winner chosen | No change — implicit logic skipped |
| Multiple explicit winners chosen | No change — implicit logic skipped |
| Unique highest score, no explicit winner | That player set as winner |
| Tied highest score, no explicit winner | No winner assigned |
| Only one player in the game | That player set as winner (unique highest score) |
