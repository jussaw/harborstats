type SearchParamValue = string | string[] | undefined;

/** Sentinel that distinguishes an explicit "select none" from the default (no param = all). */
export const STATS_NONE_SELECTED = 'none';

function getAllValues(value: SearchParamValue): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function parsePositiveInt(value: string): number | null {
  return /^[1-9]\d*$/.test(value) ? Number.parseInt(value, 10) : null;
}

/**
 * Parses the selected player ids from the stats page `?player=` search param.
 *
 * - no param -> every player (the default "select all").
 * - `player=none` -> empty selection (an empty cohort).
 * - otherwise -> the referenced ids, deduped and intersected with the known players so stale links
 *   cannot select a player that no longer exists.
 *
 * Accepts both the hyphen-delimited form (`player=1-3`) and the legacy repeated form
 * (`player=1&player=3`) so old shared links keep working.
 */
export function parseStatsSelectedPlayerIds(
  value: SearchParamValue,
  allPlayerIds: number[],
): number[] {
  const values = getAllValues(value);

  if (values.length === 0) {
    return [...allPlayerIds];
  }

  if (values.includes(STATS_NONE_SELECTED)) {
    return [];
  }

  const knownIds = new Set(allPlayerIds);
  const parsedIds = values
    .flatMap((entry) => entry.split('-'))
    .map((entry) => parsePositiveInt(entry))
    .filter((entry): entry is number => entry !== null && knownIds.has(entry));

  return [...new Set(parsedIds)];
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/**
 * Serializes a selection back into search params, keeping the URL clean in the common cases:
 *
 * - selection == all players -> no `player` param (default).
 * - selection empty -> `player=none`.
 * - otherwise -> a single hyphen-delimited `player=<id>-<id>` param.
 *
 * A single param (rather than one `player=<id>` per selection) is deliberate: the Next.js client
 * router cache collapses repeated search params to their last value when building cache keys, so
 * URLs that share a final id collide and render stale content
 * (https://github.com/vercel/next.js/issues/92152).
 */
export function createStatsSearchParams(
  selectedPlayerIds: number[],
  allPlayerIds: number[],
): URLSearchParams {
  const params = new URLSearchParams();

  if (sameIdSet(selectedPlayerIds, allPlayerIds)) {
    return params;
  }

  if (selectedPlayerIds.length === 0) {
    params.set('player', STATS_NONE_SELECTED);
    return params;
  }

  params.set('player', selectedPlayerIds.join('-'));

  return params;
}
