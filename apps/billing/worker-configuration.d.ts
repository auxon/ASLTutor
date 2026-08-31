interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>;
  get<T>(key: string, type: 'json'): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string }): Promise<{ keys: Array<{ name: string }> }>;
}

declare namespace Cloudflare {
  interface Env {
    KV: KVNamespace;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PRICE_MONTHLY: string;
    STRIPE_PRICE_YEARLY: string;
    SESSION_SECRET: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM: string;
    APP_ORIGIN: string;
    APP_BASE: string;
    ENVIRONMENT: string;
  }
}

interface Env extends Cloudflare.Env {}
