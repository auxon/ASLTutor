# Cloudflare Pages — Entangleit.com + ASLTutor subpath

Live at **https://entangleit.com/ASLTutor/**

## Architecture

| Piece | Detail |
|-------|--------|
| Pages project | `richard-hein-portfolio` |
| Custom domain | `entangleit.com` |
| Site repo | `/Users/rah/entangleit/portfolio` |
| Publish dir | `public/` |
| Routing | Advanced Mode `_worker.js` (not `_redirects` alone) |

The portfolio site uses `public/_worker.js` to route:

- `/ASLTutor/api/*` → SignFlow billing Worker (`SIGNFLOW_API` → `signflow-billing`)
- `/ASLTutor/*` → SignFlow ASL SPA (`/ASLTutor/index.html`)
- everything else → portfolio SPA

`_redirects` catch-all rewrites cannot reliably serve a nested SPA on Cloudflare Pages (Pages' default SPA fallback returns the **root** `index.html` with HTTP 200 for unknown paths).

## Deploy

```bash
# From ASLTutor repo — build + copy into portfolio publish dir
./scripts/prepare-entangleit-deploy.sh /Users/rah/entangleit/portfolio/public

# From portfolio repo — publish to Cloudflare
cd /Users/rah/entangleit/portfolio
npx wrangler pages deploy public --project-name=richard-hein-portfolio --commit-dirty=true
```

Or one-liner from ASLTutor:

```bash
./scripts/prepare-entangleit-deploy.sh /Users/rah/entangleit/portfolio/public \
  && npx wrangler pages deploy /Users/rah/entangleit/portfolio/public \
       --project-name=richard-hein-portfolio --commit-dirty=true
```

## SignFlow billing

Worker: `apps/billing` (`signflow-billing`). KV namespace `signflow-entitlements`.
Webhook URL: `https://entangleit.com/ASLTutor/api/stripe/webhook`

```bash
cd apps/billing
npx wrangler deploy
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_MONTHLY
npx wrangler secret put STRIPE_PRICE_YEARLY
npx wrangler secret put SESSION_SECRET
npx wrangler secret put RESEND_API_KEY   # optional; checkout still signs you in
```

Stripe product: SignFlow Pro, $12.99/month and $99/year, 7-day trial on Checkout.
The Pages project must bind `SIGNFLOW_API` → `signflow-billing` (see portfolio `wrangler.toml`).

## Auth
```bash
npx wrangler login   # browser OAuth; tokens expire ~3 months
npx wrangler whoami
```

## Local verification

```bash
./scripts/verify-subpath-build.sh
npm run preview -w @asl/web
# Open http://localhost:4173/ASLTutor/
```

## Post-deploy checks

- [ ] https://entangleit.com/ASLTutor/
- [ ] https://entangleit.com/ASLTutor/dictionary (hard refresh / deep link)
- [ ] https://entangleit.com/ASLTutor/lessons/lesson-alphabet
- [ ] Assets load from `/ASLTutor/assets/…`
- [ ] https://entangleit.com/ still shows the portfolio
- [ ] If HTML looks stale: Cloudflare Dashboard → Caching → Purge Everything

## Important files (portfolio)

| File | Role |
|------|------|
| `public/_worker.js` | Path routing for ASL + portfolio |
| `public/ASLTutor/` | Built SignFlow output |
| `public/_redirects` | Intentionally empty of catch-alls (worker owns routing) |
| `wrangler.toml` | `name = "entangleit"` (Pages project name is `richard-hein-portfolio`) |
