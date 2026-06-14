ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "stat_card_min_games" integer DEFAULT 5 NOT NULL;
