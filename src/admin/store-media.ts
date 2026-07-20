import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config';

const STORE_MEDIA_DIR = path.join(config.uploadsDir, 'store');

const ALLOWED_MIME: Record<string, string> = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/gif':  '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

export type StoreMediaSlot = 'logo' | 'icon';

export async function saveStoreMedia(
  slot: StoreMediaSlot,
  buffer: Buffer,
  mimetype: string,
  existingPath: string,
): Promise<string> {
  const ext = ALLOWED_MIME[mimetype];
  if (!ext) throw new Error(`Unsupported file type: ${mimetype}`);

  fs.mkdirSync(STORE_MEDIA_DIR, { recursive: true });

  // Remove old file if it exists and is in our uploads dir
  if (existingPath && existingPath.startsWith('/uploads/store/')) {
    const oldFile = path.join(config.uploadsDir, existingPath.replace('/uploads/', ''));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  const filename = `${slot}${ext}`;
  fs.writeFileSync(path.join(STORE_MEDIA_DIR, filename), buffer);
  return `/uploads/store/${filename}`;
}

export async function savePageImage(
  pageId: string,
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  const ext = ALLOWED_MIME[mimetype];
  if (!ext) throw new Error(`Unsupported file type: ${mimetype}`);
  const dir = path.join(config.uploadsDir, 'pages', pageId);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/pages/${pageId}/${filename}`;
}

export async function saveThemeImage(
  field: string,
  buffer: Buffer,
  mimetype: string,
  themeSlug: string,
): Promise<string> {
  const ext = ALLOWED_MIME[mimetype];
  if (!ext) throw new Error(`Unsupported file type: ${mimetype}`);

  const dir = path.join(config.uploadsDir, 'theme', themeSlug);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${field.replace('.', '-')}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/theme/${themeSlug}/${filename}`;
}
