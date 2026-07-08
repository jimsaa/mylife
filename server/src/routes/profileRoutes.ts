import { Router } from 'express';
import {
  getAvatarAbsolutePath,
  getProfileSettings,
  removeAvatar,
  saveAvatar,
  updateDisplayName,
} from '../services/profileService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getProfileSettings());
});

router.put('/', (req, res) => {
  const { display_name } = req.body;
  if (!display_name?.trim()) {
    res.status(400).json({ error: 'display_name is required' });
    return;
  }
  res.json(updateDisplayName(display_name));
});

router.get('/avatar', (_req, res) => {
  const avatarPath = getAvatarAbsolutePath();
  if (!avatarPath) {
    res.status(404).end();
    return;
  }
  res.sendFile(avatarPath);
});

router.post('/avatar', (req, res) => {
  try {
    const { image_base64, mime_type } = req.body;
    if (!image_base64 || !mime_type) {
      res.status(400).json({ error: 'image_base64 and mime_type are required' });
      return;
    }
    res.json(saveAvatar(image_base64, mime_type));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Upload failed' });
  }
});

router.delete('/avatar', (_req, res) => {
  res.json(removeAvatar());
});

export default router;
