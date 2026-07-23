CREATE TABLE page_views (
  id         TEXT PRIMARY KEY,
  path       TEXT NOT NULL,
  referrer   TEXT,                   -- external domain only, null for direct/internal
  ip_hash    TEXT NOT NULL,          -- sha256 of IP, for unique-visitor counting
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_page_views_created ON page_views (created_at DESC);
CREATE INDEX idx_page_views_path    ON page_views (path, created_at DESC);
