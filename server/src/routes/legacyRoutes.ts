import { Router } from 'express';
import { listAudit } from '../modules/digital-legacy/audit.js';
import {
  claimLegacyAccess,
  confirmAliveFromToken,
  confirmAliveManual,
  createContact,
  deleteContact,
  forceSendLifeCheck,
  forceTriggerActivation,
  getDashboardStatus,
  listContacts,
  loginLegacy,
  runLegacySchedulerTick,
  updateConfig,
  updateContact,
  verifyActivationToken,
} from '../services/legacyService.js';
import {
  clearLegacySessionCookie,
  createLegacySessionCookie,
  parseLegacySession,
} from '../modules/digital-legacy/legacySession.js';
import {
  completeLegacyIntro,
  createInstructionSection,
  deleteInstructionSection,
  getAccessIntroState,
  getWelcomeMessage,
  listInstructionSections,
  reorderInstructionSections,
  updateInstructionSection,
  updateWelcomeMessage,
} from '../modules/digital-legacy/estateContent.js';
import { getDb } from '../db/connection.js';

const router = Router();

function clientIp(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return req.socket?.remoteAddress ?? null;
}

function requireLegacySession(
  req: { headers: { cookie?: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } },
): { accessId: number; contactId: number } | null {
  const session = parseLegacySession(req.headers.cookie);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}

// ---------------------------------------------------------------------------
// Public endpoints (mounted before requireAdminAuth)
// ---------------------------------------------------------------------------

export const legacyPublicRouter = Router();

legacyPublicRouter.get('/confirm', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ ok: false, error: 'missing_token' });
    return;
  }
  const result = confirmAliveFromToken(token, clientIp(req));
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json({ ok: true, message: 'Life check confirmed. Thank you.' });
});

legacyPublicRouter.get('/verify', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ ok: false, error: 'missing_token' });
    return;
  }
  const result = verifyActivationToken(token, clientIp(req));
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json({
    ok: true,
    contact: {
      name: result.contact.name,
      relationship: result.contact.relationship,
      email: result.contact.email,
    },
    expires_at: result.expires_at,
  });
});

legacyPublicRouter.post('/claim', (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const result = claimLegacyAccess(token, password, clientIp(req));
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  const access = getDb()
    .prepare(
      'SELECT id, legacy_intro_completed FROM legacy_access WHERE contact_id = ?',
    )
    .get(result.contact.id) as { id: number; legacy_intro_completed: number };

  res.setHeader('Set-Cookie', createLegacySessionCookie(access.id, result.contact.id));
  res.json({
    ok: true,
    role: result.role,
    legacy_intro_completed: access.legacy_intro_completed === 1,
    contact: {
      name: result.contact.name,
      email: result.contact.email,
    },
  });
});

legacyPublicRouter.post('/login', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const result = loginLegacy(email, password, clientIp(req));
  if (!result.ok) {
    res.status(401).json(result);
    return;
  }

  const intro = getAccessIntroState(result.accessId);

  res.setHeader(
    'Set-Cookie',
    createLegacySessionCookie(result.accessId, result.contact.id),
  );
  res.json({
    ok: true,
    role: result.role,
    legacy_intro_completed: intro?.legacy_intro_completed ?? false,
    contact: { name: result.contact.name, email: result.contact.email },
  });
});

legacyPublicRouter.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearLegacySessionCookie());
  res.json({ ok: true });
});

legacyPublicRouter.get('/session', (req, res) => {
  const session = parseLegacySession(req.headers.cookie);
  if (!session) {
    res.json({ authenticated: false });
    return;
  }
  const contact = getDb()
    .prepare('SELECT name, email, relationship FROM legacy_contacts WHERE id = ?')
    .get(session.contactId) as
    | { name: string; email: string; relationship: string }
    | undefined;
  const intro = getAccessIntroState(session.accessId);

  if (!contact || !intro) {
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    role: intro.role,
    legacy_intro_completed: intro.legacy_intro_completed,
    contact,
  });
});

/** Estate content — readable by authenticated legacy contacts */
legacyPublicRouter.get('/welcome', (req, res) => {
  if (!requireLegacySession(req, res)) return;
  res.json(getWelcomeMessage());
});

legacyPublicRouter.post('/complete-intro', (req, res) => {
  const session = requireLegacySession(req, res);
  if (!session) return;
  const result = completeLegacyIntro(session.accessId, clientIp(req));
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json({ ok: true });
});

legacyPublicRouter.get('/instructions', (req, res) => {
  if (!requireLegacySession(req, res)) return;
  const sections = listInstructionSections();
  res.json({
    sections,
    updated_at:
      sections.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), '') ||
      null,
  });
});

/** External cron hook: Authorization: Bearer $LEGACY_CRON_SECRET */
legacyPublicRouter.post('/cron', async (req, res) => {
  const expected = process.env.LEGACY_CRON_SECRET;
  const auth = req.headers.authorization;
  if (!expected || auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await runLegacySchedulerTick();
  res.json(result);
});

// ---------------------------------------------------------------------------
// Admin endpoints (behind requireAdminAuth)
// ---------------------------------------------------------------------------

router.get('/status', (_req, res) => {
  res.json(getDashboardStatus());
});

router.put('/config', (req, res) => {
  res.json(updateConfig(req.body ?? {}));
});

router.get('/contacts', (_req, res) => {
  res.json(listContacts());
});

router.post('/contacts', (req, res) => {
  if (!req.body?.name?.trim() || !req.body?.email?.trim()) {
    res.status(400).json({ error: 'name and email are required' });
    return;
  }
  res.status(201).json(createContact(req.body));
});

router.put('/contacts/:id', (req, res) => {
  const contact = updateContact(parseInt(req.params.id, 10), req.body ?? {});
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  res.json(contact);
});

router.delete('/contacts/:id', (req, res) => {
  const ok = deleteContact(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  res.status(204).send();
});

router.get('/audit', (req, res) => {
  const limit = parseInt(String(req.query.limit ?? '100'), 10);
  res.json(listAudit(limit));
});

router.post('/confirm-alive', (req, res) => {
  res.json(confirmAliveManual('admin', clientIp(req)));
});

router.post('/send-life-check', async (_req, res) => {
  const result = await forceSendLifeCheck();
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post('/trigger-activation', async (_req, res) => {
  const result = await forceTriggerActivation();
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post('/run-scheduler', async (_req, res) => {
  res.json(await runLegacySchedulerTick());
});

// Welcome message (admin edit)
router.get('/welcome', (_req, res) => {
  res.json(getWelcomeMessage());
});

router.put('/welcome', (req, res) => {
  res.json(
    updateWelcomeMessage({
      title: req.body?.title,
      body: req.body?.body,
    }),
  );
});

// Legacy Instructions (admin edit)
router.get('/instructions', (_req, res) => {
  const sections = listInstructionSections();
  res.json({
    sections,
    updated_at:
      sections.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), '') ||
      null,
  });
});

router.post('/instructions', (req, res) => {
  if (!req.body?.title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  res.status(201).json(createInstructionSection(req.body));
});

router.put('/instructions/reorder', (req, res) => {
  const ids = req.body?.ordered_ids;
  if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === 'number')) {
    res.status(400).json({ error: 'ordered_ids must be a number array' });
    return;
  }
  res.json({ sections: reorderInstructionSections(ids) });
});

router.put('/instructions/:id', (req, res) => {
  const section = updateInstructionSection(parseInt(req.params.id, 10), req.body ?? {});
  if (!section) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }
  res.json(section);
});

router.delete('/instructions/:id', (req, res) => {
  const ok = deleteInstructionSection(parseInt(req.params.id, 10));
  if (!ok) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }
  res.status(204).send();
});

export default router;
