import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { isAccessAuthorized } from './lib/auth';
import { applySecurityHeaders } from './lib/security';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const isAdmin = isAdminPath(context.url.pathname);

  // Local development has no Cloudflare Access in front of it
  if (isAdmin && !import.meta.env.DEV) {
    const authorized = await isAccessAuthorized(context.request, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
    if (!authorized) return new Response('No autorizado', { status: 403 });
  }

  const response = await next();
  applySecurityHeaders(response.headers, { isDev: import.meta.env.DEV, isHttps: context.url.protocol === 'https:' });
  if (isAdmin) response.headers.set('Cache-Control', 'no-store');
  return response;
});
