/* eslint-disable no-restricted-syntax, no-continue, @typescript-eslint/no-loop-func, no-param-reassign */

import type { PlayerTier } from '@/lib/player-tier';

export const INITIAL_RATING = 1500;
export const ELO_SCALE = 400;
export const K_FACTOR = 24;
export const PROVISIONAL_GAMES = 5;

export interface RatingPlayerInput {
  playerId: number;
  name: string;
  tier: PlayerTier;
}

export interface RatingParticipantInput {
  playerId: number;
  score: number;
  isWinner: boolean;
}

export interface RatingGameInput {
  gameId: number;
  playedAt: string;
  participants: RatingParticipantInput[];
}

export interface RatingHistoryPoint {
  gameId: number;
  sequence: number;
  playedAt: string;
  rating: number;
  change: number;
  participated: boolean;
}

export interface PlayerRating extends RatingPlayerInput {
  rating: number;
  displayRating: number;
  peakRating: number;
  lastGameChange: number;
  gamesPlayed: number;
  provisional: boolean;
  history: RatingHistoryPoint[];
}

export interface RatingReplay {
  players: PlayerRating[];
  ratedGameCount: number;
}

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / ELO_SCALE));
}

function validateParticipants(participants: RatingParticipantInput[]) {
  const ids = new Set<number>();
  let winnerCount = 0;
  for (const participant of participants) {
    if (ids.has(participant.playerId)) {
      throw new Error(`Duplicate participant ${participant.playerId}.`);
    }
    ids.add(participant.playerId);
    if (participant.isWinner) winnerCount += 1;
  }
  if (winnerCount > 1) throw new Error('A rated game may have only one winner.');
  return winnerCount;
}

function pairScore(left: RatingParticipantInput, right: RatingParticipantInput): number {
  if (left.isWinner) return 1;
  if (right.isWinner) return 0;
  if (left.score > right.score) return 1;
  if (left.score < right.score) return 0;
  return 0.5;
}

export function replayRatings({
  players,
  games,
}: {
  players: RatingPlayerInput[];
  games: RatingGameInput[];
}): RatingReplay {
  const state = new Map<number, PlayerRating>(
    players.map((player) => [
      player.playerId,
      {
        ...player,
        rating: INITIAL_RATING,
        displayRating: INITIAL_RATING,
        peakRating: INITIAL_RATING,
        lastGameChange: 0,
        gamesPlayed: 0,
        provisional: true,
        history: [],
      },
    ]),
  );
  const orderedGames = [...games].sort(
    (left, right) => left.playedAt.localeCompare(right.playedAt) || left.gameId - right.gameId,
  );
  let ratedGameCount = 0;

  for (const game of orderedGames) {
    const participants = [...game.participants].sort(
      (left, right) => left.playerId - right.playerId,
    );
    const winnerCount = validateParticipants(participants);
    if (participants.length < 2 || winnerCount === 0) continue;
    if (participants.some((participant) => !state.has(participant.playerId))) {
      throw new Error('Game contains a player missing from the replay roster.');
    }

    const deltas = new Map<number, number>(
      participants.map((participant) => [participant.playerId, 0]),
    );
    const pairK = K_FACTOR / (participants.length - 1);
    for (let leftIndex = 0; leftIndex < participants.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < participants.length; rightIndex += 1) {
        const left = participants[leftIndex];
        const right = participants[rightIndex];
        const leftRating = state.get(left.playerId)?.rating ?? INITIAL_RATING;
        const rightRating = state.get(right.playerId)?.rating ?? INITIAL_RATING;
        const delta = pairK * (pairScore(left, right) - expectedScore(leftRating, rightRating));
        deltas.set(left.playerId, (deltas.get(left.playerId) ?? 0) + delta);
        deltas.set(right.playerId, (deltas.get(right.playerId) ?? 0) - delta);
      }
    }

    const participantIds = new Set(participants.map((participant) => participant.playerId));
    state.forEach((player) => {
      if (player.history.length > 0 && !participantIds.has(player.playerId)) {
        player.history.push({
          gameId: game.gameId,
          sequence: ratedGameCount,
          playedAt: game.playedAt,
          rating: player.rating,
          change: 0,
          participated: false,
        });
      }
    });
    for (const participant of participants) {
      const player = state.get(participant.playerId);
      if (!player) continue;
      const change = deltas.get(participant.playerId) ?? 0;
      player.rating += change;
      player.peakRating = Math.max(player.peakRating, player.rating);
      player.lastGameChange = change;
      player.gamesPlayed += 1;
      player.history.push({
        gameId: game.gameId,
        sequence: ratedGameCount,
        playedAt: game.playedAt,
        rating: player.rating,
        change,
        participated: true,
      });
    }
    ratedGameCount += 1;
  }

  const output = [...state.values()];
  output.forEach((player) => {
    player.displayRating = Math.round(player.rating);
    player.provisional = player.gamesPlayed < PROVISIONAL_GAMES;
  });
  output.sort(
    (left, right) =>
      right.displayRating - left.displayRating ||
      right.rating - left.rating ||
      left.name.localeCompare(right.name) ||
      left.playerId - right.playerId,
  );
  return { players: output, ratedGameCount };
}
