CREATE UNIQUE INDEX IF NOT EXISTS "game_players_game_id_player_id_unique" ON "game_players" USING btree ("game_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_players_one_winner_per_game" ON "game_players" USING btree ("game_id") WHERE "game_players"."is_winner" = true;--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "podium_rate_min_games" SET DEFAULT 0;
