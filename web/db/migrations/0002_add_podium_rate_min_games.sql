ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "podium_rate_min_games" integer DEFAULT 0 NOT NULL;
