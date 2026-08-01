# Post-deploy verification checklist

Run after deploying to `https://entangleit.com/ASLTutor/`.

## Automated (local pre-deploy)

```bash
./scripts/verify-subpath-build.sh
npm run preview -w @asl/web
# Visit http://localhost:4173/ASLTutor/ and http://localhost:4173/ASLTutor/dictionary
```

## Production checks

| Check | How | Pass |
|-------|-----|------|
| Home loads | Open `https://entangleit.com/ASLTutor/` | 3D hands render |
| Deep link | Open `https://entangleit.com/ASLTutor/dictionary` directly | Dictionary page, not 404 |
| Refresh | Refresh on `/ASLTutor/lessons` | Same page, not 404 |
| Assets | DevTools → Network | JS/CSS from `/ASLTutor/assets/` |
| Main site | Open `https://entangleit.com/` | Unchanged |
| HTTPS camera | `/ASLTutor/practice` → Start Camera | Permission prompt works |
| Service worker | DevTools → Application → Service Workers | Scope is `/ASLTutor/` |
| Trailing slash | Open `/ASLTutor` (no slash) | Redirects to `/ASLTutor/` |

## Cloudflare cache purge

If assets look stale after deploy:

1. Cloudflare Dashboard → Caching → Configuration → **Purge Everything**, or
2. Purge Custom Cache → `entangleit.com/ASLTutor/*`

## Link from main site

Add to Entangleit.com navigation:

```html
<a href="/ASLTutor/">ASL Tutor</a>
```
