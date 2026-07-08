import type { EmailEventPayload, EmailEventType, EmailProvider } from './types';

class NoopEmailProvider implements EmailProvider {
  readonly name = 'noop';

  async send<T extends EmailEventType>(_event: T, _payload: EmailEventPayload[T]): Promise<void> {
    // Intentionally empty — wire Resend/Postmark later
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    const name = process.env.EMAIL_PROVIDER ?? 'noop';
    if (name === 'noop') provider = new NoopEmailProvider();
  }
  return provider!;
}

export async function emitEmailEvent<T extends EmailEventType>(
  event: T,
  payload: EmailEventPayload[T]
): Promise<void> {
  const email = getEmailProvider();
  await email.send(event, payload);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[email] ${event}`, payload);
  }
}
