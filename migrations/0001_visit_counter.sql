CREATE TABLE IF NOT EXISTS visit_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  baseline INTEGER NOT NULL CHECK (baseline >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  data_through TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_visits (
  visit_date TEXT PRIMARY KEY,
  visits INTEGER NOT NULL CHECK (visits >= 0),
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  source TEXT NOT NULL,
  synced_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visit_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  visits INTEGER,
  message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_sync_runs_date
  ON visit_sync_runs (visit_date, finished_at);

-- Initialize visit_counter separately with the baseline and start date that
-- belong to your own site. Production values are intentionally not published.
