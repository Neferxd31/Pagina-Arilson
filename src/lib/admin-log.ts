import type { APIContext } from 'astro';
import { env } from 'cloudflare:workers';
import type { ActivityAction } from './activity';
import { logActivity } from './db';

// Every admin change goes through here so the activity log always says who did what
export async function recordAdminChange(context: APIContext, action: ActivityAction, target: string): Promise<void> {
  await logActivity(env.DB, context.locals.adminEmail ?? 'desconocido', action, target);
}
