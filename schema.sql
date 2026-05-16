-- Helix user backend — Cloudflare D1 schema.
-- Apply with:  wrangler d1 execute helix-db --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS users (
  wallet       TEXT PRIMARY KEY,            -- Solana address = identity
  created_at   INTEGER NOT NULL,
  tier         TEXT NOT NULL DEFAULT 'pro',
  tier_billing TEXT DEFAULT 'trial',
  tier_since   INTEGER,
  trial_until  INTEGER,
  name         TEXT,
  email        TEXT
);

CREATE TABLE IF NOT EXISTS watchlist (
  wallet     TEXT NOT NULL,                 -- owner (the signed-in user)
  address    TEXT NOT NULL,                 -- tracked wallet
  label      TEXT,
  added_at   INTEGER NOT NULL,
  PRIMARY KEY (wallet, address)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_wallet ON watchlist(wallet);

-- One-time sign-in challenges (pruned on use / by age).
CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce      TEXT PRIMARY KEY,
  wallet     TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
