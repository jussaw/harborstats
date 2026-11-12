CREATE TABLE IF NOT EXISTS `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`win_rate_min_games` integer DEFAULT 0 NOT NULL,
	`podium_rate_min_games` integer DEFAULT 0 NOT NULL,
	`stat_card_min_games` integer DEFAULT 5 NOT NULL,
	`new_game_password_hash` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_ip` text,
	`entity_type` text,
	`entity_id` text,
	`summary` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z') NOT NULL,
	CONSTRAINT "audit_logs_actor_type_check" CHECK("audit_logs"."actor_type" IN ('admin', 'game', 'anonymous'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `game_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`score` integer NOT NULL,
	`is_winner` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "game_players_score_check" CHECK("game_players"."score" >= 0 AND "game_players"."score" <= 30)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_game_players_game` ON `game_players` (`game_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_game_players_player` ON `game_players` (`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `game_players_game_id_player_id_unique` ON `game_players` (`game_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `game_players_one_winner_per_game` ON `game_players` (`game_id`) WHERE "game_players"."is_winner" = 1;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`played_at` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`submitted_from_ip` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tier` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z') NOT NULL,
	CONSTRAINT "players_tier_check" CHECK("players"."tier" IN ('premium', 'standard'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `players_name_unique` ON `players` (`name`);