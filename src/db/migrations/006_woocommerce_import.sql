-- ── WooCommerce import support ───────────────────────────────────────────────
-- External IDs let a re-run of the importer update existing rows instead of
-- duplicating them (matched product/order stays matched across runs).

ALTER TABLE products    ADD COLUMN wc_id INTEGER;
ALTER TABLE collections ADD COLUMN wc_id INTEGER;
ALTER TABLE orders      ADD COLUMN wc_id INTEGER;

CREATE UNIQUE INDEX idx_products_wc_id    ON products    (wc_id) WHERE wc_id IS NOT NULL;
CREATE UNIQUE INDEX idx_collections_wc_id ON collections (wc_id) WHERE wc_id IS NOT NULL;
CREATE UNIQUE INDEX idx_orders_wc_id      ON orders      (wc_id) WHERE wc_id IS NOT NULL;

-- ── Import jobs ───────────────────────────────────────────────────────────────
-- Tracks progress of a running/finished import so the admin UI can poll it.

CREATE TABLE import_jobs (
  id          TEXT    PRIMARY KEY,
  source      TEXT    NOT NULL,               -- 'wxr' | 'woocommerce_api'
  status      TEXT    NOT NULL DEFAULT 'running', -- 'running' | 'completed' | 'failed'
  stage       TEXT    NOT NULL DEFAULT '',     -- human-readable current step
  total       INTEGER NOT NULL DEFAULT 0,
  processed   INTEGER NOT NULL DEFAULT 0,
  errors      TEXT    NOT NULL DEFAULT '[]',   -- JSON array of { item, message }
  created_at  TEXT    DEFAULT (datetime('now')),
  finished_at TEXT
);
