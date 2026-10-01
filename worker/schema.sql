-- Sync server database (Cloudflare D1). Safe to run more than once.

-- One row per learner: their progress as JSON, keyed by Google account ID
CREATE TABLE IF NOT EXISTS progress (
  user_id    TEXT PRIMARY KEY,          -- Google account ID ("sub")
  email      TEXT,                      -- so you can find a learner who asks for help
  data       TEXT,                      -- progress JSON; NULL until the first save
  version    INTEGER NOT NULL DEFAULT 0, -- goes up by one on every save
  updated_at INTEGER NOT NULL           -- milliseconds since 1970
);

-- One row per signed-in device. Only a hash of the device's token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);
