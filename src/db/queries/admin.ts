import { query, queryOne, execute } from '../connection';

export interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}

export function findAdminByEmail(email: string): AdminUserRow | null {
  return queryOne<AdminUserRow>(
    'SELECT id, email, password_hash, name FROM admin_users WHERE email = ?',
    [email],
  );
}

export function findAdminById(id: string): AdminUserRow | null {
  return queryOne<AdminUserRow>(
    'SELECT id, email, password_hash, name FROM admin_users WHERE id = ?',
    [id],
  );
}

export function createAdminUser(id: string, email: string, passwordHash: string, name: string): void {
  execute(
    'INSERT INTO admin_users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
    [id, email, passwordHash, name],
  );
}

export function countAdminUsers(): number {
  const row = queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM admin_users');
  return row?.n ?? 0;
}

export interface SettingRow { key: string; value: string }

export function getSetting(key: string): string | null {
  return queryOne<SettingRow>('SELECT value FROM store_settings WHERE key = ?', [key])?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  execute(
    'INSERT INTO store_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime(\'now\')',
    [key, value],
  );
}

export function getAllSettings(): Record<string, string> {
  const rows = query<SettingRow>('SELECT key, value FROM store_settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
