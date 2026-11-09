import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { getAccessEmail, isAllowedAdmin, parseAdminEmails } from './lib/auth';
import { applySecurityHeaders, isSameOriginRequest } from './lib/security';

const DEV_ADMIN_EMAIL = 'dev@localhost';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const isAdmin = isAdminPath(context.url.pathname);

  if (isAdmin) {
    const { method, headers } = context.request;
    if (!isSameOriginRequest(method, headers.get('origin'), context.url.origin)) {
      return new Response('Solicitud no permitida', { status: 403 });
    }

    // Local development has no Cloudflare Access in front of it
    if (import.meta.env.DEV) {
      context.locals.adminEmail = DEV_ADMIN_EMAIL;
    } else {
      const email = await getAccessEmail(context.request, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
      if (!isAllowedAdmin(email, parseAdminEmails(env.ADMIN_EMAILS))) return new Response('No autorizado', { status: 403 });
      context.locals.adminEmail = email!;
    }
  }

  const response = await next();
  applySecurityHeaders(response.headers, { isDev: import.meta.env.DEV, isHttps: context.url.protocol === 'https:' });
  if (isAdmin) response.headers.set('Cache-Control', 'no-store');
  return response;
});
