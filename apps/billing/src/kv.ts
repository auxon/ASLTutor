export type Entitlement = {
  email: string;
  customerId: string;
  subscriptionId: string;
  status: import('./types').EntitlementStatus;
  priceId: string;
  plan: import('./types').Plan;
  currentPeriodEnd: number;
  updatedAt: number;
};

export function entitlementKey(email: string): string {
  return `ent:${email.trim().toLowerCase()}`;
}

export function magicKey(hash: string): string {
  return `magic:${hash}`;
}

export function rateKey(email: string): string {
  return `rl:${email.trim().toLowerCase()}`;
}

export async function getEntitlement(
  kv: KVNamespace,
  email: string,
): Promise<Entitlement | null> {
  return kv.get<Entitlement>(entitlementKey(email), 'json');
}

export async function putEntitlement(kv: KVNamespace, ent: Entitlement): Promise<void> {
  await kv.put(entitlementKey(ent.email), JSON.stringify(ent));
  if (ent.customerId) {
    await kv.put(`cust:${ent.customerId}`, ent.email);
  }
}
