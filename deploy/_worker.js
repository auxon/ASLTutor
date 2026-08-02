/**
 * Cloudflare Pages Advanced Mode worker for entangleit.com.
 * Routes /ASLTutor/* to the SignFlow SPA and everything else to the portfolio SPA.
 *
 * Uses env.ASSETS (Pages asset binding) — required for Advanced Mode.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Canonical trailing slash for the ASL app root.
    if (pathname === '/ASLTutor') {
      url.pathname = '/ASLTutor/';
      return Response.redirect(url.toString(), 301);
    }

    if (pathname === '/ASLTutor/' || pathname.startsWith('/ASLTutor/')) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return env.ASSETS.fetch(new URL('/ASLTutor/index.html', url));
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return env.ASSETS.fetch(new URL('/index.html', url));
  },
};
