const BASE = '/api';

async function parseBody(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
    };
  }
  const text = await res.text().catch(() => '');
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
    return {
      error:
        'API route returned the website HTML instead of JSON. On jimsaari.se this means the Project Cards API is not deployed yet — pull latest and redeploy, or use local npm run dev.',
    };
  }
  return { error: text.slice(0, 200) || res.statusText };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await parseBody(res);
    const error = new Error(body.error ?? 'Request failed') as Error & {
      status?: number;
      body?: unknown;
    };
    error.status = res.status;
    error.body = body;
    throw error;
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const body = await parseBody(res);
    throw new Error(body.error ?? 'Unexpected non-JSON API response');
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
