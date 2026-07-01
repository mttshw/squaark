-- ── Products ──────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id                TEXT    PRIMARY KEY,
  title             TEXT    NOT NULL,
  slug              TEXT    NOT NULL UNIQUE,
  description       TEXT,
  description_plain TEXT,
  vendor            TEXT,
  tags_text         TEXT    DEFAULT '',
  published         INTEGER DEFAULT 1,
  created_at        TEXT    DEFAULT (datetime('now')),
  updated_at        TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_slug      ON products (slug);
CREATE INDEX idx_products_published ON products (published);

CREATE TABLE product_images (
  id         TEXT    PRIMARY KEY,
  product_id TEXT    NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  original   TEXT    NOT NULL,
  thumbnail  TEXT    NOT NULL,
  medium     TEXT    NOT NULL,
  large      TEXT    NOT NULL,
  alt        TEXT    DEFAULT '',
  position   INTEGER DEFAULT 0
);

CREATE INDEX idx_product_images_product ON product_images (product_id, position);

CREATE TABLE product_variants (
  id                 TEXT    PRIMARY KEY,
  product_id         TEXT    NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  title              TEXT    NOT NULL DEFAULT 'Default',
  price              INTEGER NOT NULL,
  compare_at_price   INTEGER,
  sku                TEXT,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  options            TEXT    DEFAULT '{}',
  image_id           TEXT    REFERENCES product_images (id) ON DELETE SET NULL,
  position           INTEGER DEFAULT 0,
  created_at         TEXT    DEFAULT (datetime('now')),
  updated_at         TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX idx_variants_product ON product_variants (product_id, position);

-- ── Collections ───────────────────────────────────────────────────────────────

CREATE TABLE collections (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  description TEXT,
  published   INTEGER DEFAULT 1,
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE collection_products (
  collection_id TEXT    NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  product_id    TEXT    NOT NULL REFERENCES products (id)    ON DELETE CASCADE,
  position      INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- ── Cart ──────────────────────────────────────────────────────────────────────

CREATE TABLE carts (
  id              TEXT    PRIMARY KEY,
  discount_code   TEXT,
  discount_amount INTEGER DEFAULT 0,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE cart_items (
  id         TEXT    PRIMARY KEY,
  cart_id    TEXT    NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  variant_id TEXT    NOT NULL REFERENCES product_variants (id),
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TEXT    DEFAULT (datetime('now')),
  updated_at TEXT    DEFAULT (datetime('now')),
  UNIQUE (cart_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);
