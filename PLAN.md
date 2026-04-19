# HarborStats — Game Insights Brainstorm

A menu of stat / graph / table / leaderboard ideas to surface insights from game history. Organized by category. No implementation decisions yet — pick from this list later.

## Legend

Placement tags: `[H]` home page · `[S]` new `/stats` landing · `[P]` per-player profile · `[HH]` head-to-head view · `[A]` admin
`*` = requires new data capture (schema change or new form field)

## 1. Performance (win rates, rankings)

- [ ] Total wins leaderboard — ties broken by win rate `[S]`
- [ ] Win rate leaderboard — with minimum-games threshold `[S]`
- [ ] Average score per player `[S][P]`
- [ ] Median score per player `[S][P]`
- [ ] Finish-position breakdown — % 1st / 2nd / 3rd / last (ranked within each game; needs a tie rule) `[S][P]`
- [ ] Podium rate — % finishing 1st or 2nd `[S][P]`
- [ ] Avg margin of victory `[P]`
- [ ] Avg margin of defeat `[P]`
- [ ] Win rate by opponent count (3p / 4p / 5p / 6p) `[P]`
- [ ] Tier showdown — premium vs standard aggregate `[S]`
- [ ] Expected-vs-actual wins — baseline 1/N vs. real; rough over/underperformance signal `[S][P]`

## 2. Activity (over time)

- [ ] Games per week / month line chart `[S]`
- [ ] Cumulative games area chart `[S]`
- [ ] Calendar heatmap — GitHub-contribution-style grid `[S]`
- [ ] Player attendance over time — stacked chart `[S]`
- [ ] Participation rate per player `[S][P]`
- [ ] Days since last game tile `[H][S]`
- [ ] Longest gap between games record `[S]`
- [ ] Busiest day / week / month records `[S]`
- [ ] Avg games per session (session = same day) `[S]`
- [ ] Day-of-week pattern `[S]`
- [ ] Time-of-day pattern (feasible today from `played_at` timestamp) `[S]`

## 3. Head-to-Head (rivalries)

- [ ] H2H matrix — grid of players × players `[HH][S]`
- [ ] Nemesis (opponent who beats you most) `[P]`
- [ ] Favorite opponent (opponent you beat most) `[P]`
- [ ] Closest rivalry — tightest record `[S]`
- [ ] Most lopsided rivalry — biggest gap `[S]`
- [ ] Most-played-with partner `[P]`
- [ ] "Beat X specifically" tally — out-scored opponent head-to-head even in games neither won overall `[HH]`

## 4. Streaks & Records

- [ ] Current win streak per player + current leader `[H][S][P]`
- [ ] Longest win streak ever (all-time record) `[S][P]`
- [ ] Current / longest loss streak `[P]`
- [ ] Attendance streak — most consecutive games without missing `[P]`
- [ ] Highest-scoring game ever — record with date and player `[S]`
- [ ] Lowest winning score — squeakiest win `[S]`
- [ ] Biggest blowout — largest winning margin `[S]`
- [ ] Closest game — smallest winning margin `[S]`
- [ ] Most wins in a single week / month `[S][P]`
- [ ] Reigning champion — whoever won the most recent game `[H]`

## 5. Score Patterns

- [ ] Score histogram across all `game_players` rows `[S]`
- [ ] Per-player score distribution — side-by-side box/violin plots `[S][P]`
- [ ] Avg winning score vs. avg losing score `[S]`
- [ ] Does winning score scale with player count? `[S]`
- [ ] Total VP scored ever — cumulative leaderboard `[S][P]`
- [ ] Points-per-game leaderboard (normalized) `[S]`
- [ ] % of games with a tied top score (ties currently leave `is_winner=false`) `[A][S]`

## 6. Fun Curiosities

- [ ] First ever recorded game — dated reference `[S]`
- [ ] "Bridesmaid" stat — most 2nd-place finishes `[S]`
- [ ] Hot-hand indicator — players on 3+ wins in last 5 games `[H]`
- [ ] Player of the month — most wins in current calendar month `[H][S]`
- [ ] Auto-generated badges / epithets — "The Bridesmaid", "The Closer", "The Road Warrior", etc. `[P]`
- [ ] Notes word cloud / frequent phrases `[S]` (low value, high novelty)
- [ ] Anomaly list — games with no winner despite no score tie, duplicate player rows, etc. `[A]`

## Appendix: Schema-dependent ideas (not possible today)

- [ ] Game duration → longest / shortest sessions, marathon record `*`
- [ ] Expansion / variant tag → performance by Base / C&K / Seafarers `*`
- [ ] Map name or seed → which maps favor whom `*`
- [ ] Turn / seating order → "does going first matter?" `*`
- [ ] Final VP components (longest road, largest army, dev cards, settlements) → "won via X" stats `*`
- [ ] Colonist.io replay link per game → per-game "review" button `*`
- [ ] Robber-victim log → who gets robbed most `*`
- [ ] Comeback tracking (turn-by-turn scores) → "came back from last" record `*`
- [ ] Per-game tags (marathon / grudge-match / revenge / rookie-night) → filterable views `*`
