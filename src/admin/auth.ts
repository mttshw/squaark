import argon2 from 'argon2';
import { findAdminByEmail, findAdminById, createAdminUser, countAdminUsers } from '../db/queries/admin';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export async function verifyLogin(email: string, password: string): Promise<AdminUser | null> {
  const row = findAdminByEmail(email.toLowerCase().trim());
  if (!row) return null;
  const ok = await argon2.verify(row.password_hash, password);
  if (!ok) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export function getAdminById(id: string): AdminUser | null {
  const row = findAdminById(id);
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export async function createFirstAdmin(email: string, password: string, name: string): Promise<void> {
  if (countAdminUsers() > 0) throw new Error('Admin user already exists');
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  createAdminUser(crypto.randomUUID(), email.toLowerCase().trim(), hash, name);
}

export function adminExists(): boolean {
  return countAdminUsers() > 0;
}
