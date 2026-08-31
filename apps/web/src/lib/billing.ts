import type { Entitlement, Plan } from '@/engine/entitlement';
import { FREE_ENTITLEMENT } from '@/engine/entitlement';

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed.');
  }
  return data;
}

export async function fetchMe(): Promise<Entitlement> {
  try {
    const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
    if (!res.ok) return { ...FREE_ENTITLEMENT };
    return (await res.json()) as Entitlement;
  } catch {
    return { ...FREE_ENTITLEMENT };
  }
}

export async function requestMagicLink(email: string): Promise<{ loginUrl?: string }> {
  return parseJson(await fetch(`${API_BASE}/auth/request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  }));
}

export async function verifyMagicLink(token: string): Promise<Entitlement> {
  return parseJson(
    await fetch(`${API_BASE}/auth/verify?token=${encodeURIComponent(token)}`, {
      credentials: 'include',
    }),
  );
}

export async function logoutBilling(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function startCheckout(plan: Exclude<Plan, null>): Promise<string> {
  const data = await parseJson<{ url: string }>(
    await fetch(`${API_BASE}/checkout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    }),
  );
  return data.url;
}

export async function confirmCheckout(sessionId: string): Promise<Entitlement> {
  return parseJson(
    await fetch(`${API_BASE}/checkout/confirm`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }),
  );
}

export async function openBillingPortal(): Promise<string> {
  const data = await parseJson<{ url: string }>(
    await fetch(`${API_BASE}/portal`, {
      method: 'POST',
      credentials: 'include',
    }),
  );
  return data.url;
}
