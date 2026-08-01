# Cloudflare Pages — Entangleit.com + ASLTutor subpath

Deploy the ASL app at `https://entangleit.com/ASLTutor/`.

## Quick deploy (same Pages project as Entangleit.com)

```bash
# 1. Build and copy into your Entangleit site publish directory
chmod +x scripts/prepare-entangleit-deploy.sh
./scripts/prepare-entangleit-deploy.sh /path/to/entangleit-site/public

# 2. Deploy via Wrangler (replace project name)
npx wrangler pages deploy /path/to/entangleit-site/public --project-name=entangleit
```

The script:
- Builds with `base: /ASLTutor/`
- Copies `apps/web/dist/*` → `public/ASLTutor/`
- Merges SPA redirect rules into the site root `_redirects`

## Root `_redirects` (required on combined site)

```
/ASLTutor  /ASLTutor/  301
/ASLTutor/*  /ASLTutor/index.html  200
```

See [deploy/entangleit-redirects.snippet](entangleit-redirects.snippet).

## Standalone ASL-only deploy (separate Pages project)

If the ASL app is deployed alone (e.g. preview URL), use:

```bash
npm run build
npx wrangler pages deploy apps/web/dist --project-name=signflow-asl
```

For production on `entangleit.com/ASLTutor`, you still need Option A (subfolder) or a Worker proxy (see plan).

## Local verification

```bash
npm run build
npm run preview -w @asl/web
# Open http://localhost:4173/ASLTutor/
```

## Post-deploy checks

- [ ] `https://entangleit.com/ASLTutor/` loads
- [ ] Refresh on `/ASLTutor/dictionary` returns 200 (not 404)
- [ ] Network tab shows assets from `/ASLTutor/assets/`
- [ ] Main site `/` unchanged
- [ ] Purge Cloudflare cache for `/ASLTutor/*` if stale
