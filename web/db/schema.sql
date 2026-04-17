CREATE TABLE IF NOT EXISTS players (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  tier        TEXT NOT NULL CHECK (tier IN ('premium', 'standard')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id                SERIAL PRIMARY KEY,
  played_at         TIMESTAMPTZ NOT NULL,
  notes             TEXT NOT NULL DEFAULT '',
  submitted_from_ip INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES players(id),
  score       INTEGER NOT NULL CHECK (score >= 0),
  is_winner   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_game_players_game   ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id);

INSERT INTO players (name, tier) VALUES
  ('Player Alpha', 'premium'),
  ('Player Bravo',   'premium'),
  ('Player Charlie',   'premium'),
  ('Player Delta',    'premium'),
  ('Player Echo',      'premium'),
  ('Player Foxtrot',  'premium'),
  ('Player Golf',     'standard'),
  ('Player Hotel',   'standard')
ON CONFLICT (name) DO NOTHING;
