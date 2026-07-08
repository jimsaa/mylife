export type EmailEventType =
  | 'user.registered'
  | 'purchase.completed'
  | 'monthly_drop.published'
  | 'vip.upgrade';

export interface EmailEventPayload {
  'user.registered': { email: string; full_name: string | null };
  'purchase.completed': { email: string; product: string; amount_cents: number };
  'monthly_drop.published': { title: string; month: string; member_count: number };
  'vip.upgrade': { email: string };
}

export interface EmailProvider {
  readonly name: string;
  send<T extends EmailEventType>(event: T, payload: EmailEventPayload[T]): Promise<void>;
}
