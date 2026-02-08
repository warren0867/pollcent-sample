-- ============================================
-- Pollcent Sample DB Schema
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password_hash TEXT,
  kakao_id TEXT UNIQUE,
  nickname TEXT NOT NULL,
  login_type TEXT NOT NULL CHECK(login_type IN ('kakao', 'email')),
  reward_delay_days INTEGER NOT NULL DEFAULT 30,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  coupang_order_id TEXT UNIQUE,
  product_name TEXT,
  amount INTEGER NOT NULL,
  commission INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
  purchased_at DATETIME,
  confirmed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  purchase_id INTEGER REFERENCES purchases(id),
  type TEXT NOT NULL CHECK(type IN ('lottery', 'roulette')),
  status TEXT NOT NULL DEFAULT 'unused' CHECK(status IN ('unused','used','expired')),
  reward_amount INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME
);

CREATE TABLE IF NOT EXISTS delayed_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  purchase_id INTEGER REFERENCES purchases(id),
  tier TEXT NOT NULL CHECK(tier IN ('bronze','silver','gold')),
  purchase_amount INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL,
  delay_days INTEGER NOT NULL,
  available_at DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','available','exchanged','expired')),
  exchanged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exchange_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reward_id INTEGER,
  reward_type TEXT CHECK(reward_type IN ('ticket','delayed')),
  amount INTEGER NOT NULL,
  exchange_method TEXT CHECK(exchange_method IN ('cash','point','gift')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_delayed_rewards_user ON delayed_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_delayed_rewards_status ON delayed_rewards(status, available_at);
CREATE TABLE IF NOT EXISTS price_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_name TEXT NOT NULL,
  product_url TEXT,
  target_price INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL REFERENCES price_tracks(id),
  price INTEGER NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_limits(user_id, date);
CREATE INDEX IF NOT EXISTS idx_price_tracks_user ON price_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_track ON price_history(track_id);
