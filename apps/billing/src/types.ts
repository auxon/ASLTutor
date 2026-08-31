export type Plan = 'monthly' | 'yearly' | null;

export type EntitlementStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

export type MeResponse = {
  email: string | null;
  status: EntitlementStatus;
  plan: Plan;
  currentPeriodEnd: number | null;
  configured: boolean;
  pro: boolean;
};
