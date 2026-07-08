import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSetting, setSetting } from './settingsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.resolve(__dirname, '../../data/avatars');

const ALLOWED_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
};

const MAX_BYTES = 5 * 1024 * 1024;

function ensureAvatarDir(): void {
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
}

export interface ProfileSettings {
  display_name: string;
  avatar_path: string | null;
  avatar_url: string | null;
}

export function getProfileSettings(): ProfileSettings {
  const display_name = getSetting('display_name') ?? 'Jim';
  const avatar_path = getSetting('avatar_path');
  const hasAvatar = avatar_path && fs.existsSync(path.resolve(__dirname, '../../data', avatar_path));

  return {
    display_name,
    avatar_path: hasAvatar ? avatar_path : null,
    avatar_url: hasAvatar ? '/api/profile/avatar' : null,
  };
}

export function getAvatarAbsolutePath(): string | null {
  const avatar_path = getSetting('avatar_path');
  if (!avatar_path) return null;
  const absolute = path.resolve(__dirname, '../../data', avatar_path);
  return fs.existsSync(absolute) ? absolute : null;
}

export function updateDisplayName(name: string): ProfileSettings {
  setSetting('display_name', name.trim() || 'Jim');
  return getProfileSettings();
}

export function saveAvatar(imageBase64: string, mimeType: string): ProfileSettings {
  if (!ALLOWED_MIME[mimeType]) {
    throw new Error('Ogiltigt filformat. Använd PNG, JPG eller WEBP.');
  }

  const buffer = Buffer.from(imageBase64, 'base64');
  if (buffer.length > MAX_BYTES) {
    throw new Error('Filen är för stor. Max 5 MB.');
  }

  ensureAvatarDir();

  const existing = getSetting('avatar_path');
  if (existing) {
    const oldPath = path.resolve(__dirname, '../../data', existing);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const ext = ALLOWED_MIME[mimeType];
  const filename = `avatar${ext}`;
  const relativePath = path.join('avatars', filename);
  const absolutePath = path.join(AVATAR_DIR, filename);

  fs.writeFileSync(absolutePath, buffer);
  setSetting('avatar_path', relativePath.replace(/\\/g, '/'));

  return getProfileSettings();
}

export function removeAvatar(): ProfileSettings {
  const existing = getSetting('avatar_path');
  if (existing) {
    const absolute = path.resolve(__dirname, '../../data', existing);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  }
  setSetting('avatar_path', '');
  return getProfileSettings();
}

export function getSwedishGreeting(displayName: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return `God morgon, ${displayName} ☀️`;
  if (hour >= 11 && hour < 17) return `God dag, ${displayName} 👋`;
  return `God kväll, ${displayName} 🌙`;
}
