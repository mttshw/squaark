-- ── Admin users ──────────────────────────────────────────────────────────────

CREATE TABLE admin_users (
  id            TEXT    PRIMARY KEY,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    DEFAULT (datetime('now')),
  updated_at    TEXT    DEFAULT (datetime('now'))
);

-- ── Orders ───────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id              TEXT    PRIMARY KEY,
  order_number    INTEGER NOT NULL UNIQUE,
  email           TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending',
  fulfillment     TEXT    NOT NULL DEFAULT 'unfulfilled',
  subtotal        INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  shipping        INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'GBP',
  discount_code   TEXT,
  notes           TEXT,
  shipping_address TEXT   DEFAULT '{}',
  billing_address  TEXT   DEFAULT '{}',
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_status  ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at);

CREATE TABLE order_items (
  id           TEXT    PRIMARY KEY,
  order_id     TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id   TEXT,
  product_title TEXT   NOT NULL,
  variant_title TEXT   NOT NULL DEFAULT 'Default',
  sku          TEXT,
  price        INTEGER NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  line_total   INTEGER NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ── Store settings ────────────────────────────────────────────────────────────

CREATE TABLE store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO store_settings (key, value) VALUES
  ('store_name',     'My Store'),
  ('store_currency', 'GBP'),
  ('store_url',      'http://localhost:3000'),
  ('store_email',    ''),
  ('store_timezone', 'Europe/London');
