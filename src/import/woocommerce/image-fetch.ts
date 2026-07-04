import { processUploadedImage, type ProcessedImage } from '../../admin/images';

const cache = new Map<string, Promise<ProcessedImage>>();

/** Downloads a remote product image and runs it through the normal upload pipeline (resize + WebP). */
export async function importRemoteImage(url: string): Promise<ProcessedImage> {
  const existing = cache.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download image (${res.status}): ${url}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return processUploadedImage(buffer, url.split('/').pop() || 'image.jpg');
  })();

  cache.set(url, promise);
  return promise;
}
