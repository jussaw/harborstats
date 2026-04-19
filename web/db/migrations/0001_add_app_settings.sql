CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"win_rate_min_games" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO app_settings (id, win_rate_min_games) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
