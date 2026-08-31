export const FREE_SIGN_IDS = [
  'sign-a',
  'sign-b',
  'sign-c',
  'sign-d',
  'sign-e',
  'sign-hello',
  'sign-name',
] as const;

export type EntitlementStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

export type Plan = 'monthly' | 'yearly' | null;

export type Entitlement = {
  email: string | null;
  status: EntitlementStatus;
  plan: Plan;
  currentPeriodEnd: number | null;
  configured: boolean;
  pro: boolean;
};

export const FREE_ENTITLEMENT: Entitlement = {
  email: null,
  status: 'free',
  plan: null,
  currentPeriodEnd: null,
  configured: false,
  pro: false,
};

const FREE_SET = new Set<string>(FREE_SIGN_IDS);

export function isFreeSign(signId: string): boolean {
  return FREE_SET.has(signId);
}

export function canUseCamera(ent: Entitlement, signId: string): boolean {
  return ent.pro || isFreeSign(signId);
}

export function canUseLessons(ent: Entitlement): boolean {
  return ent.pro;
}

export function canUseSrs(ent: Entitlement): boolean {
  return ent.pro;
}

export function isProStatus(status: EntitlementStatus): boolean {
  return status === 'trialing' || status === 'active' || status === 'past_due';
}
