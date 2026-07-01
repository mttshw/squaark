import { createHash } from 'crypto';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export type AssetManifest = Record<string, string>;

export function contentHash(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

export async function buildAssetManifest(themePath: string): Promise<AssetManifest> {
  const assetsDir = path.join(themePath, 'assets');
  if (!existsSync(assetsDir)) return {};

  const manifest: AssetManifest = {};

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const content = await readFile(fullPath);
        const hash = contentHash(content);
        const ext = path.extname(entry.name);
        const base = path.basename(entry.name, ext);
        const hashed = `${base}.${hash}${ext}`;
        const rel = path.relative(assetsDir, fullPath).replace(/\\/g, '/');
        manifest[rel] = hashed;
      }
    }
  }

  await walk(assetsDir);
  return manifest;
}

export function buildReverseManifest(manifest: AssetManifest): AssetManifest {
  return Object.fromEntries(Object.entries(manifest).map(([orig, hashed]) => [hashed, orig]));
}

export function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
  };
  return types[ext] || 'application/octet-stream';
}
