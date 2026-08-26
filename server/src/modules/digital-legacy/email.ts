/**
 * Email provider for Digital Legacy.
 * Console/noop by default; set EMAIL_PROVIDER=resend + RESEND_API_KEY for production.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSendResult {
  ok: boolean;
  provider: string;
  error?: string;
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();

  if (provider === 'resend') {
    return sendViaResend(message);
  }

  // Default: log to console (safe for local/dev — never sends passwords)
  console.log('[email:console]', {
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
  return { ok: true, provider: 'console' };
}

async function sendViaResend(message: EmailMessage): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'My Life <onboarding@resend.dev>';

  if (!apiKey) {
    return { ok: false, provider: 'resend', error: 'RESEND_API_KEY not set' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, provider: 'resend', error: body };
    }

    return { ok: true, provider: 'resend' };
  } catch (err) {
    return {
      ok: false,
      provider: 'resend',
      error: err instanceof Error ? err.message : 'send failed',
    };
  }
}

export function lifeCheckEmailHtml(confirmUrl: string): { subject: string; text: string; html: string } {
  const subject = 'My Life - Monthly Life Check';
  const text = [
    'Please confirm that you are still active by opening the secure confirmation link below.',
    '',
    confirmUrl,
    '',
    'If the button does not work, copy and paste the link into your browser.',
    'This link is one-time use and expires after a limited time.',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
  <p>Please confirm that you are still active by clicking the secure confirmation button below.</p>
  <p style="margin: 28px 0;">
    <a href="${confirmUrl}"
       style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
      I'm Alive
    </a>
  </p>
  <p style="font-size:13px;color:#64748b;">
    Or open this link:<br/>
    <a href="${confirmUrl}">${confirmUrl}</a>
  </p>
  <p style="font-size:12px;color:#94a3b8;">This is a one-time secure link. It expires automatically.</p>
</body>
</html>`.trim();

  return { subject, text, html };
}

export function reminderEmailHtml(
  monthLabel: string,
  confirmUrl: string,
): { subject: string; text: string; html: string } {
  const subject = `My Life - Life Check Reminder (${monthLabel})`;
  const text = [
    `This is reminder ${monthLabel}. Please confirm you are still active.`,
    '',
    confirmUrl,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
  <p><strong>Reminder (${monthLabel})</strong></p>
  <p>We have not received your life-check confirmation. Please confirm you are still active.</p>
  <p style="margin: 28px 0;">
    <a href="${confirmUrl}"
       style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
      I'm Alive
    </a>
  </p>
</body>
</html>`.trim();

  return { subject, text, html };
}

export function legacyActivationEmailHtml(
  contactName: string,
  portalUrl: string,
  hoursValid: number,
): { subject: string; text: string; html: string } {
  const subject = 'My Life - Secure Legacy Access';
  const text = [
    `Hello ${contactName},`,
    '',
    'You have been designated as a legacy contact for My Life.',
    'After a period of inactivity, secure one-time access has been granted to you.',
    '',
    'Open this secure link to verify and create your own password:',
    portalUrl,
    '',
    `This link expires in ${hoursValid} hours and can be used only once.`,
    'No passwords are sent in this email.',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
  <p>Hello ${escapeHtml(contactName)},</p>
  <p>You have been designated as a legacy contact for <strong>My Life</strong>.</p>
  <p>After a period of inactivity, secure one-time access has been prepared for you.</p>
  <p style="margin: 28px 0;">
    <a href="${portalUrl}"
       style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
      Open Legacy Portal
    </a>
  </p>
  <p style="font-size:13px;color:#64748b;">
    This link expires in <strong>${hoursValid} hours</strong> and can be used only once.<br/>
    No passwords are included in this email. You will create your own password after verification.
  </p>
</body>
</html>`.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
