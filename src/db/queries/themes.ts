import { query, queryOne, execute } from '../connection';

export interface ThemeRow {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  directory: string;
  manifest: string;
  config_overrides: string;
  active: number;
  installed_at: string;
}

export function findAllThemes(): ThemeRow[] {
  return query<ThemeRow>('SELECT * FROM themes ORDER BY active DESC, name ASC');
}

export function findActiveTheme(): ThemeRow | null {
  return queryOne<ThemeRow>('SELECT * FROM themes WHERE active = 1');
}

export function findThemeById(id: string): ThemeRow | null {
  return queryOne<ThemeRow>('SELECT * FROM themes WHERE id = ?', [id]);
}

export function findThemeBySlug(slug: string): ThemeRow | null {
  return queryOne<ThemeRow>('SELECT * FROM themes WHERE slug = ?', [slug]);
}

export function activateTheme(id: string): void {
  execute("UPDATE themes SET active = 0, updated_at = datetime('now')");
  execute("UPDATE themes SET active = 1, updated_at = datetime('now') WHERE id = ?", [id]);
}

export function saveConfigOverrides(id: string, overrides: Record<string, unknown>): void {
  execute(
    "UPDATE themes SET config_overrides = ?, updated_at = datetime('now') WHERE id = ?",
    [JSON.stringify(overrides), id],
  );
}

export function registerTheme(
  id: string,
  name: string,
  slug: string,
  version: string,
  description: string,
  author: string,
  directory: string,
): void {
  execute(
    `INSERT INTO themes (id, name, slug, version, description, author, directory)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET
       name = excluded.name, version = excluded.version,
       description = excluded.description, author = excluded.author,
       directory = excluded.directory, updated_at = datetime('now')`,
    [id, name, slug, version, description, author, directory],
  );
}
