ALTER TABLE "game_players" DROP CONSTRAINT IF EXISTS "game_players_score_check";--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_score_check" CHECK ("game_players"."score" >= 0 AND "game_players"."score" <= 30);
