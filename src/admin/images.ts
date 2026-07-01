import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import config from '../config';

const SIZES = {
  thumbnail: { width: 100, height: 100 },
  medium:    { width: 600, height: 600 },
  large:     { width: 1200, height: 1200 },
} as const;

export interface ProcessedImage {
  original:  string;
  thumbnail: string;
  medium:    string;
  large:     string;
}

export async function processUploadedImage(buffer: Buffer, originalName: string): Promise<ProcessedImage> {
  const id = crypto.randomUUID();
  const ext = '.webp';
  const dir = path.join(config.uploadsDir, 'products', id);
  fs.mkdirSync(dir, { recursive: true });

  const write = async (suffix: string, buf: Buffer) => {
    const rel = `/uploads/products/${id}/${suffix}${ext}`;
    fs.writeFileSync(path.join(config.uploadsDir, 'products', id, `${suffix}${ext}`), buf);
    return rel;
  };

  const src = sharp(buffer).rotate();

  const [original, thumbnail, medium, large] = await Promise.all([
    src.clone().webp({ quality: 85 }).toBuffer().then(b => write('original', b)),
    src.clone().resize(SIZES.thumbnail.width, SIZES.thumbnail.height, { fit: 'cover' }).webp({ quality: 80 }).toBuffer().then(b => write('thumbnail', b)),
    src.clone().resize(SIZES.medium.width, SIZES.medium.height, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer().then(b => write('medium', b)),
    src.clone().resize(SIZES.large.width, SIZES.large.height, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer().then(b => write('large', b)),
  ]);

  return { original, thumbnail, medium, large };
}

export function deleteProductImages(imageId: string): void {
  const dir = path.join(config.uploadsDir, 'products', imageId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
}
