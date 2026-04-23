# HarborStats — Game Insights Brainstorm

A menu of stat / graph / table / leaderboard ideas to surface insights from game history. Organized by category in implementation priority order. Each feature is scoped for a single agent session.

## Layout & Navigation

### Stats page
- [x] Reorganize as a responsive grid of self-contained stat cards/components; each item in the plan below maps to one card.
- Stats card sizing convention: any stats card whose inline content changes on hover or focus must reserve enough height for its richest inline state so the card and its grid row stay stable during interaction.

### Player profile page
- [x] Banner at the top of the page for the profile header (name and key summary numbers).
- [x] Below the banner: responsive grid of stat cards for all per-player stats.

### Global navigation
- [x] Replace any top-bar or inline nav on the **main (home) page** and the **admin page** with a collapsible sidebar navigation.
- [x] Sidebar should link to: Home, Stats, Admin (if applicable), and individual player profiles.

## Leaderboard ranking convention

All leaderboard-style tables (any ranked list on `[S]`, `[P]`, `[H]`, or `[HH]` pages) must use **standard competition ranking ("1224")**:
- Players tied on the primary metric share the top rank they're tied for.
- The next distinct value skips forward by the number of tied rows (e.g. three-way tie for 1st → next rank is 4th).
- Rank 1 displays the 👑 emoji; all other ranks display the numeric position.
- Use the `rankWithTies` helper in `web/app/stats/page.tsx` (or extract to `web/lib/rank.ts` if it becomes widely imported) to compute ranks from any pre-sorted array.

## Legend

Placement tags: `[H]` home page · `[S]` new `/stats` landing · `[P]` per-player profile · `[HH]` head-to-head view · `[A]` admin
`*` = requires new data capture (schema change or new form field)

## 1. Performance (win rates, rankings)

### 1.1 Total wins leaderboard `[S]`
- [x] Rank every player by all-time win count; break ties by win rate.

### 1.2 Win rate leaderboard `[S]`
- [x] Rank players by win percentage, filtered by a configurable minimum-games threshold.
- **Needs:** game count per player (share query from 1.1)

### 1.3 Average score per player `[S]` `[P]`
- [x] `[S]` Show each player's mean score across all their games.
- [x] `[P]` Show player's mean score on their profile page.

### 1.4 Median score per player `[S]` `[P]`
- [x] `[S]` Show each player's median score; more robust than mean for skewed distributions.
- [x] `[P]` Show player's median score on their profile page.
- **Needs:** per-player score list (share query from 1.3)

### 1.5 Podium rate `[S]` `[P]`
- [x] `[S]` Show each player's percentage of games finishing 1st or 2nd.
- [x] `[P]` Show player's podium rate on their profile page.

### 1.6 Finish-position breakdown `[S]` `[P]`
- [x] Show % of games each player finished 1st / 2nd / 3rd / last; needs a defined tie-breaking rule.
- **Needs:** finish position per game (extend query from 1.5)

### 1.7 Average margin of victory `[P]`
- [x] For games a player won, show their mean score gap over the runner-up.

### 1.8 Average margin of defeat `[P]`
- [x] For games a player lost, show their mean gap behind the winner.
- **Needs:** winner score per game (share query from 1.7)

### 1.9 Win rate by opponent count `[P]`
- [x] Break out each player's win rate by game size (3p / 4p / 5p / 6p).

### 1.10 Tier showdown `[S]`
- [x] Aggregate and compare win rates across premium vs. standard tier players.

### 1.11 Expected-vs-actual wins `[S]` `[P]`
- [x] Compare each player's actual win count against the baseline 1/N expectation as an over/underperformance signal.
- **Needs:** game-size data (share query from 1.9)

## 2. Activity (over time)

All activity and time-based stats in this section use the viewer's local time.

### 2.1 Days since last game tile `[H]` `[S]`
- [x] Show how many days have passed since the most recent recorded game.

### 2.2 Games per week / month line chart `[S]`
- [x] Plot game frequency over time as a line chart bucketed by week or month.

### 2.3 Participation rate per player `[S]` `[P]`
- [x] Show what percentage of all games each player has appeared in.
- **Needs:** total game count (extend query from 2.2)

### 2.4 Player attendance over time `[S]`
- [x] Stacked chart showing which players participated in each time bucket.
- **Needs:** per-player game dates (extend query from 2.3)

### 2.5 Cumulative games area chart `[S]`
- [x] Area chart of total games played over time.
- **Needs:** game date list (share query from 2.2)

### 2.6 Calendar heatmap `[S]`
- [x] GitHub-contribution-style grid showing game frequency by calendar day.
- **Needs:** game date list (share query from 2.2)

### 2.7 Day-of-week pattern `[S]`
- [x] Bar chart of how many games have been played on each day of the week in the viewer's local time.

### 2.8 Time-of-day pattern `[S]`
- [x] Distribution of game start times bucketed by hour, using `played_at` timestamp in the viewer's local time.

### 2.9 Average games per session `[S]`
- [x] Compute mean number of games played per session, where a session is games on the same local calendar day.

### 2.10 Busiest day / week / month records `[S]`
- [x] Surface the single most active day, week, and month by game count.
- **Needs:** bucketed game counts (share query from 2.2)

### 2.11 Longest gap between games `[S]`
- [x] Find the longest stretch of days between two consecutive games.
- **Needs:** sorted game date list (share query from 2.2)

## 3. Streaks & Records

### 3.1 Reigning champion `[H]`
- [x] Show whoever won the most recent game as a home-page highlight tile.

### 3.2 Current win streak per player + current leader `[H]` `[S]` `[P]`
- [x] Calculate each player's active win streak and surface the player with the longest current streak.

### 3.3 Most wins in a single week / month `[S]` `[P]`
- [x] Find each player's personal best for wins in a calendar week and month.

### 3.4 Highest-scoring game ever `[S]`
- [x] Record of the single highest individual score, with date and player name.

### 3.5 Lowest winning score `[S]`
- [x] The squeakiest win: lowest score that was still good enough to win a game.
- **Needs:** winner score per game (share query from 3.4)

### 3.6 Biggest blowout `[S]`
- [x] Game with the largest gap between winner and runner-up score.
- **Needs:** margin per game (extend query from 3.4)

### 3.7 Closest game `[S]`
- [x] Game with the smallest gap between winner and runner-up score.
- **Needs:** margin per game (share query from 3.6)

### 3.8 Longest win streak ever `[S]` `[P]`
- [x] Each player's all-time record win streak and the period it occurred.
- **Needs:** streak logic (extend query from 3.2)

### 3.9 Current / longest loss streak `[P]`
- [x] Each player's active and all-time worst losing run.
- **Needs:** streak logic (extend query from 3.8)

### 3.10 Attendance streak `[P]`
- [x] Most consecutive games played without missing one.
- **Needs:** game dates per player (extend approach from 3.9)

## 4. Score Patterns

### 4.1 Average winning score vs. average losing score `[S]`
- [x] Side-by-side comparison of mean winner score vs. mean non-winner score across all games.

### 4.2 Total VP scored ever — cumulative leaderboard `[S]` `[P]`
- [x] Rank players by the total points they have scored across all games.

### 4.3 Points-per-game leaderboard `[S]`
- [x] Normalize total VP by games played to rank players by scoring efficiency.
- **Needs:** total VP and game count (share queries from 4.2 and 1.1)

### 4.4 Score histogram `[S]`
- [ ] Histogram of all individual scores across every `game_players` row.

### 4.5 Per-player score distribution `[S]` `[P]`
- [ ] Side-by-side box or violin plots showing each player's score spread.
- **Needs:** per-player score list (share query from 4.4)

### 4.6 Does winning score scale with player count? `[S]`
- [x] Scatter or grouped bar chart of average winning score by game size.
- **Needs:** winner score + game size (share queries from 4.1 and 1.9)

### 4.7 % of games with a tied top score `[A]` `[S]`
- [ ] Count games where two or more players share the highest score (currently `is_winner=false` for tied players).

## 5. Head-to-Head (rivalries)

### 5.1 Most-played-with partner `[P]`
- [ ] For each player, show who they have shared the most games with.

### 5.2 Nemesis `[P]`
- [ ] The opponent who beats a given player most often in head-to-head matchups.
- **Needs:** H2H win/loss records (extend query from 5.1)

### 5.3 Favorite opponent `[P]`
- [ ] The opponent a given player beats most often in head-to-head matchups.
- **Needs:** H2H win/loss records (share query from 5.2)

### 5.4 Closest rivalry `[S]`
- [ ] The player pair with the most even head-to-head win/loss record.
- **Needs:** H2H records (share query from 5.2)

### 5.5 Most lopsided rivalry `[S]`
- [ ] The player pair with the most one-sided head-to-head record.
- **Needs:** H2H records (share query from 5.4)

### 5.6 H2H matrix `[HH]` `[S]`
- [ ] Full grid of players × players showing win counts and win rates.
- **Needs:** full H2H records (share query from 5.2)

### 5.7 "Beat X specifically" tally `[HH]`
- [ ] Count how often one player out-scored a specific opponent head-to-head, even in games neither won overall.
- **Needs:** per-game score comparison (extend query from 5.6)

## 6. Fun Curiosities

### 6.1 First ever recorded game `[S]`
- [ ] Display a dated reference to the very first game in the database.

### 6.2 Player of the month `[H]` `[S]`
- [ ] Highlight the player with the most wins in the current calendar month.

### 6.3 Hot-hand indicator `[H]`
- [ ] Flag players on 3 or more wins in their last 5 games.
- **Needs:** recent win history (share query from 3.2)

### 6.4 "Bridesmaid" stat `[S]`
- [ ] Rank players by total number of 2nd-place finishes.
- **Needs:** finish-position data (share query from 1.6)

### 6.5 Auto-generated badges / epithets `[P]`
- [ ] Assign flavour titles based on stats ("The Bridesmaid", "The Closer", "The Road Warrior", etc.).
- **Needs:** data from multiple prior features (1.6, 3.2, 3.8, 5.2, 5.3)

### 6.6 Notes word cloud `[S]`
- [ ] Visualise frequent words and phrases from game notes. Low value, high novelty.

### 6.7 Anomaly list `[A]`
- [ ] Surface games with no winner despite no score tie, duplicate player rows, or other data inconsistencies.

## Appendix: Schema-dependent ideas (not possible today)

- [ ] Game duration → longest / shortest sessions, marathon record `*`
- [ ] Expansion / variant tag → performance by Base / C&K / Seafarers `*`
- [ ] Map name or seed → which maps favour whom `*`
- [ ] Turn / seating order → "does going first matter?" `*`
- [ ] Final VP components (longest road, largest army, dev cards, settlements) → "won via X" stats `*`
- [ ] Colonist.io replay link per game → per-game "review" button `*`
- [ ] Robber-victim log → who gets robbed most `*`
- [ ] Comeback tracking (turn-by-turn scores) → "came back from last" record `*`
- [ ] Per-game tags (marathon / grudge-match / revenge / rookie-night) → filterable views `*`
