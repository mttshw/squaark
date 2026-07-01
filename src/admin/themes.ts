import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import AdmZip from 'adm-zip';
import { loadManifest } from '../theme/config';
import { registerTheme } from '../db/queries/themes';

const THEMES_DIR = path.resolve(process.cwd(), 'themes');

export interface UploadResult {
  slug: string;
  name: string;
}

export async function installThemeFromZip(buffer: Buffer): Promise<UploadResult> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Security: reject if any entry has path traversal
  for (const entry of entries) {
    const normalized = path.normalize(entry.entryName);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      throw new Error(`Invalid path in zip: ${entry.entryName}`);
    }
  }

  // Find theme.json — must be at the root of a single top-level directory
  const themeJsonEntry = entries.find(e => /^[^/]+\/theme\.json$/.test(e.entryName));
  if (!themeJsonEntry) throw new Error('theme.json not found in zip root');

  const topDir = themeJsonEntry.entryName.split('/')[0];
  const manifestJson = JSON.parse(themeJsonEntry.getData().toString('utf-8'));
  const slug = (manifestJson.name as string).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const destDir = path.join(THEMES_DIR, slug);

  // Remove existing installation if present
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  fs.mkdirSync(destDir, { recursive: true });

  // Extract only files under the top-level directory
  for (const entry of entries) {
    if (!entry.entryName.startsWith(`${topDir}/`) || entry.isDirectory) continue;
    const relative = entry.entryName.slice(topDir.length + 1);
    const destPath = path.join(destDir, relative);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, entry.getData());
  }

  const manifest = loadManifest(destDir);
  registerTheme(
    crypto.randomUUID(),
    manifest.name,
    slug,
    manifest.version ?? '1.0.0',
    manifest.description ?? '',
    manifest.author ?? '',
    `themes/${slug}`,
  );

  return { slug, name: manifest.name };
}
