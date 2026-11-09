import type { APIContext } from 'astro';
import { env } from 'cloudflare:workers';
import type { ActivityAction } from './activity';
import { logActivity } from './db';

// Every admin change goes through here: the activity log says who did what,
// and the cached store pages are purged so the change shows up right away
export async function recordAdminChange(context: APIContext, action: ActivityAction, target: string): Promise<void> {
  await logActivity(env.DB, context.locals.adminEmail ?? 'desconocido', action, target);
  if (!context.cache.enabled) return;

  try {
    await context.cache.invalidate({ tags: ['store'] });
  } catch (error) {
    // A failed purge must not undo the admin change: pages refresh on their own after maxAge
    console.error('Cache purge failed', error);
  }
}
