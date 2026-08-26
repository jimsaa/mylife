/**
 * Project Cards — filesystem image storage (same pattern as profile avatars).
 * Files live under server/data/project-cards/ — never stored as DB blobs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_CARDS_DIR = path.resolve(__dirname, '../../../data/project-cards');

const ALLOWED_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

const MAX_BYTES = 5 * 1024 * 1024;

export function ensureProjectCardsDir(): void {
  if (!fs.existsSync(PROJECT_CARDS_DIR)) {
    fs.mkdirSync(PROJECT_CARDS_DIR, { recursive: true });
  }
}

export function saveProjectCardImage(imageBase64: string, mimeType: string): string {
  if (!ALLOWED_MIME[mimeType]) {
    throw new Error('Invalid file type. Use PNG, JPG, or WEBP.');
  }

  const buffer = Buffer.from(imageBase64, 'base64');
  if (buffer.length > MAX_BYTES) {
    throw new Error('File too large. Max 5 MB.');
  }

  ensureProjectCardsDir();

  const ext = ALLOWED_MIME[mimeType];
  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  const absolutePath = path.join(PROJECT_CARDS_DIR, filename);
  fs.writeFileSync(absolutePath, buffer);

  return path.join('project-cards', filename).replace(/\\/g, '/');
}

export function deleteProjectCardImage(relativePath: string | null | undefined): void {
  if (!relativePath) return;
  const absolute = path.resolve(__dirname, '../../../data', relativePath);
  if (!absolute.startsWith(path.resolve(__dirname, '../../../data'))) return;
  if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
}

export function resolveProjectCardImageAbsolute(relativePath: string): string | null {
  const absolute = path.resolve(__dirname, '../../../data', relativePath);
  if (!absolute.startsWith(path.resolve(__dirname, '../../../data'))) return null;
  return fs.existsSync(absolute) ? absolute : null;
}
