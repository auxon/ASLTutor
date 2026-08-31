import {
  cookieHeader,
  parseCookie,
  randomToken,
  sha256Hex,
  signSession,
  verifySession,
  verifyStripeSignature,
} from './crypto';
import {
  createCheckoutSession,
  createPortalSession,
  findCustomerByEmail,
  getCheckoutSession,
  getSubscription,
  stripeConfigured,
  type StripeSubscription,
} from './stripe';
import {
  getEntitlement,
  magicKey,
  putEntitlement,
  rateKey,
  type Entitlement,
} from './kv';
import type { MeResponse, Plan } from './types';

const SESSION_DAYS = 90;
const MAGIC_TTL_SEC = 60 * 15;
function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...Object.fromEntries(new Headers(extra)),
    },
  });
}

function appUrl(env: Env, path: string): string {
  const base = env.APP_BASE.replace(/\/$/, '');
  return `${env.APP_ORIGIN}${base}${path}`;
}

function isLocal(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function planForPrice(env: Env, priceId: string | undefined): Plan {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_MONTHLY) return 'monthly';
  if (priceId === env.STRIPE_PRICE_YEARLY) return 'yearly';
  return null;
}

function isProStatus(status: Entitlement['status'] | undefined): boolean {
  return status === 'trialing' || status === 'active' || status === 'past_due';
}

function toMe(email: string | null, ent: Entitlement | null, configured: boolean): MeResponse {
  const status = ent?.status ?? 'free';
  return {
    email,
    status: email && isProStatus(status) ? status : email ? status : 'free',
    plan: ent?.plan ?? null,
    currentPeriodEnd: ent?.currentPeriodEnd ?? null,
    configured,
    pro: Boolean(email && isProStatus(status)),
  };
}

async function sessionEmail(request: Request, env: Env): Promise<string | null> {
  const token = parseCookie(request.headers.get('cookie'), 'signflow_session');
  if (!token || !env.SESSION_SECRET) return null;
  return verifySession(token, env.SESSION_SECRET);
}

async function setSession(env: Env, request: Request, email: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const token = await signSession(email, exp, env.SESSION_SECRET);
  return cookieHeader('signflow_session', token, {
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: !isLocal(new URL(request.url)),
    path: env.APP_BASE || '/ASLTutor',
  });
}

function clearSession(env: Env, request: Request): string {
  return cookieHeader('signflow_session', '', {
    maxAge: 0,
    secure: !isLocal(new URL(request.url)),
    path: env.APP_BASE || '/ASLTutor',
  });
}

async function entitlementFromSubscription(
  env: Env,
  email: string,
  customerId: string,
  sub: StripeSubscription,
): Promise<Entitlement> {
  const priceId = sub.items?.data?.[0]?.price?.id;
  const periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : Date.now();
  const ent: Entitlement = {
    email,
    customerId,
    subscriptionId: sub.id,
    status: (sub.status as Entitlement['status']) ?? 'free',
    priceId: priceId ?? '',
    plan: planForPrice(env, priceId),
    currentPeriodEnd: periodEnd,
    updatedAt: Date.now(),
  };
  await putEntitlement(env.KV, ent);
  return ent;
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const email = await sessionEmail(request, env);
  const ent = email ? await getEntitlement(env.KV, email) : null;
  return json(toMe(email, ent, stripeConfigured(env)));
}

async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Enter a valid email.' }, 400);
  }
  const rl = rateKey(email);
  if (await env.KV.get(rl)) {
    return json({ ok: true });
  }
  await env.KV.put(rl, '1', { expirationTtl: 60 });

  const token = randomToken(24);
  const hash = await sha256Hex(token);
  await env.KV.put(magicKey(hash), email, { expirationTtl: MAGIC_TTL_SEC });
  const loginUrl = appUrl(env, `/account?token=${token}`);

  if (env.RESEND_API_KEY) {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: 'Your SignFlow sign-in link',
        text: `Sign in to SignFlow:\n\n${loginUrl}\n\nThis link expires in 15 minutes. If you did not request it, ignore this email.`,
      }),
    });
    if (!sent.ok) {
      console.error(JSON.stringify({ msg: 'resend_failed', status: sent.status }));
      return json({ error: 'Could not send the sign-in email. Try again in a minute.' }, 502);
    }
    return json({ ok: true });
  }

  if (env.ENVIRONMENT !== 'production') {
    return json({ ok: true, loginUrl });
  }
  return json(
    {
      error:
        'Email sign-in is not configured yet. Start a 7-day trial with Stripe — that signs you in.',
    },
    503,
  );
}

async function handleAuthVerify(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  if (!token) return json({ error: 'Missing sign-in link.' }, 400);
  const hash = await sha256Hex(token);
  const email = await env.KV.get(magicKey(hash));
  if (!email) return json({ error: 'That sign-in link expired. Request a new one.' }, 400);
  await env.KV.delete(magicKey(hash));
  const ent = await getEntitlement(env.KV, email);
  return json(toMe(email, ent, stripeConfigured(env)), 200, {
    'set-cookie': await setSession(env, request, email),
  });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  return json({ ok: true }, 200, { 'set-cookie': clearSession(env, request) });
}

async function handleCheckout(request: Request, env: Env): Promise<Response> {
  if (!stripeConfigured(env)) {
    return json({ error: 'Billing is not configured yet.' }, 503);
  }
  const body = (await request.json()) as { plan?: Plan };
  const plan = body.plan === 'yearly' ? 'yearly' : 'monthly';
  const price = plan === 'yearly' ? env.STRIPE_PRICE_YEARLY : env.STRIPE_PRICE_MONTHLY;
  if (!price) return json({ error: 'That plan is not available yet.' }, 503);

  const email = await sessionEmail(request, env);
  let customer = email ? await findCustomerByEmail(env, email) : null;
  if (email) {
    const ent = await getEntitlement(env.KV, email);
    if (ent && isProStatus(ent.status) && ent.customerId) {
      const portal = await createPortalSession(env, ent.customerId, appUrl(env, '/account'));
      return json({ url: portal.url });
    }
    if (ent?.customerId) customer = ent.customerId;
  }

  const session = await createCheckoutSession(env, {
    priceId: price,
    customerId: customer,
    customerEmail: customer ? undefined : (email ?? undefined),
    successUrl: appUrl(env, '/account?checkout=success&session_id={CHECKOUT_SESSION_ID}'),
    cancelUrl: appUrl(env, '/#pricing'),
  });
  if (!session.url) return json({ error: 'Could not start checkout.' }, 502);
  return json({ url: session.url });
}

async function handleConfirm(request: Request, env: Env): Promise<Response> {
  if (!stripeConfigured(env)) return json({ error: 'Billing is not configured yet.' }, 503);
  const body = (await request.json()) as { sessionId?: string };
  const sessionId = body.sessionId ?? '';
  if (!sessionId.startsWith('cs_')) return json({ error: 'Missing checkout session.' }, 400);
  const session = await getCheckoutSession(env, sessionId);
  const email = (session.customer_details?.email ?? session.customer_email ?? '')
    .trim()
    .toLowerCase();
  if (!email) return json({ error: 'Checkout did not include an email.' }, 400);
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  if (customerId && subscriptionId) {
    const sub = await getSubscription(env, subscriptionId);
    await entitlementFromSubscription(env, email, customerId, sub);
  }
  const ent = await getEntitlement(env.KV, email);
  return json(toMe(email, ent, true), 200, {
    'set-cookie': await setSession(env, request, email),
  });
}

async function handlePortal(request: Request, env: Env): Promise<Response> {
  if (!stripeConfigured(env)) return json({ error: 'Billing is not configured yet.' }, 503);
  const email = await sessionEmail(request, env);
  if (!email) return json({ error: 'Sign in first.' }, 401);
  const ent = await getEntitlement(env.KV, email);
  const customerId = ent?.customerId ?? (await findCustomerByEmail(env, email));
  if (!customerId) return json({ error: 'No billing account for this email yet.' }, 404);
  const portal = await createPortalSession(env, customerId, appUrl(env, '/account'));
  return json({ url: portal.url });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return json({ error: 'Webhook not configured.' }, 503);
  }
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';
  const ok = await verifyStripeSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: 'Invalid signature.' }, 400);

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: Record<string, unknown> };
  };
  console.log(JSON.stringify({ msg: 'stripe_event', type: event.type }));

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      customer?: string | { id: string };
      customer_email?: string;
      customer_details?: { email?: string };
      subscription?: string | { id: string };
    };
    const email = (session.customer_details?.email ?? session.customer_email ?? '')
      .trim()
      .toLowerCase();
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (email && customerId && subscriptionId) {
      const sub = await getSubscription(env, subscriptionId);
      await entitlementFromSubscription(env, email, customerId, sub);
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.created'
  ) {
    const sub = event.data.object as StripeSubscription & {
      customer?: string;
    };
    const customerId = typeof sub.customer === 'string' ? sub.customer : undefined;
    if (customerId && sub.id) {
      const full = await getSubscription(env, sub.id);
      const email = (
        full.customer && typeof full.customer === 'object'
          ? (full.customer as { email?: string }).email
          : undefined
      )
        ?.trim()
        .toLowerCase();
      const existingEmail =
        email ??
        (await env.KV.get(`cust:${customerId}`)) ??
        (await findEmailForCustomer(env, customerId));
      if (existingEmail) {
        await env.KV.put(`cust:${customerId}`, existingEmail);
        await entitlementFromSubscription(env, existingEmail, customerId, full);
      }
    }
  }

  return json({ received: true });
}

async function findEmailForCustomer(env: Env, customerId: string): Promise<string | null> {
  const listed = await env.KV.list({ prefix: 'ent:' });
  for (const key of listed.keys) {
    const ent = await env.KV.get<Entitlement>(key.name, 'json');
    if (ent?.customerId === customerId) return ent.email;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (path === '/api/health' && request.method === 'GET') {
        return json({ ok: true, stripe: stripeConfigured(env) });
      }
      if (path === '/api/me' && request.method === 'GET') return handleMe(request, env);
      if (path === '/api/auth/request' && request.method === 'POST') {
        return handleAuthRequest(request, env);
      }
      if (path === '/api/auth/verify' && request.method === 'GET') {
        return handleAuthVerify(request, env);
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        return handleLogout(request, env);
      }
      if (path === '/api/checkout' && request.method === 'POST') {
        return handleCheckout(request, env);
      }
      if (path === '/api/checkout/confirm' && request.method === 'POST') {
        return handleConfirm(request, env);
      }
      if (path === '/api/portal' && request.method === 'POST') return handlePortal(request, env);
      if (path === '/api/stripe/webhook' && request.method === 'POST') {
        return handleWebhook(request, env);
      }
      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(JSON.stringify({ msg: 'billing_error', err: String(err) }));
      return json({ error: 'Something went wrong.' }, 500);
    }
  },
};
