CREATE TABLE pages (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  content     TEXT    NOT NULL DEFAULT '',
  excerpt     TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'published',
  wc_id       INTEGER,
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_pages_wc_id ON pages (wc_id) WHERE wc_id IS NOT NULL;
