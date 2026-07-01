CREATE TABLE themes (
  id               TEXT    PRIMARY KEY,
  name             TEXT    NOT NULL,
  slug             TEXT    NOT NULL UNIQUE,
  version          TEXT    NOT NULL DEFAULT '1.0.0',
  description      TEXT    DEFAULT '',
  author           TEXT    DEFAULT '',
  directory        TEXT    NOT NULL,
  manifest         TEXT    NOT NULL DEFAULT '{}',
  config_overrides TEXT    NOT NULL DEFAULT '{}',
  active           INTEGER NOT NULL DEFAULT 0,
  installed_at     TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_themes_active ON themes (active) WHERE active = 1;

-- Register the built-in linen theme as active
INSERT INTO themes (id, name, slug, version, description, author, directory, manifest, active)
VALUES (
  'theme-linen-builtin',
  'Linen',
  'linen',
  '1.0.0',
  'Clean, minimal ecommerce theme',
  'Core Team',
  'themes/linen',
  '{}',
  1
);
