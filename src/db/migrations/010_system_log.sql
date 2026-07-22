CREATE TABLE system_log (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  level      TEXT NOT NULL DEFAULT 'info',
  message    TEXT NOT NULL,
  meta       TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_system_log_type    ON system_log (type, created_at DESC);
CREATE INDEX idx_system_log_created ON system_log (created_at DESC);
