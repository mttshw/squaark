ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';

CREATE TABLE customers (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_customers_email ON customers (email);
