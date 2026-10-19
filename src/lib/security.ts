// Restricts what the browser may load: our own files, Google Fonts, Turnstile and the TikTok/Instagram video embeds.
// 'unsafe-inline' is needed because Astro inlines small scripts and styles.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  'frame-src https://challenges.cloudflare.com https://www.tiktok.com https://www.instagram.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

export function applySecurityHeaders(headers: Headers, options: { isDev: boolean; isHttps: boolean }): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // The dev server injects its own inline scripts and websockets, so the CSP only runs in the built site
  if (!options.isDev) headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  if (options.isHttps) headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
