import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { recordAdminChange } from '../../../../lib/admin-log';
import { findOrphanImages } from '../../../../lib/admin-products';
import { listUsedImageKeys } from '../../../../lib/db';

// R2 lists and deletes at most 1000 objects per call
const BATCH_SIZE = 1000;

export const POST: APIRoute = async (context) => {
  const usedKeys = await listUsedImageKeys(env.DB);
  const now = new Date();
  const orphans: string[] = [];

  let cursor: string | undefined;
  do {
    const page = await env.MEDIA.list({ prefix: 'p/', cursor, limit: BATCH_SIZE });
    orphans.push(...findOrphanImages(page.objects, usedKeys, now));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  for (let start = 0; start < orphans.length; start += BATCH_SIZE) {
    await env.MEDIA.delete(orphans.slice(start, start + BATCH_SIZE));
  }

  if (orphans.length > 0) await recordAdminChange(context, 'images.cleanup', `${orphans.length} foto(s)`);
  return Response.json({ deleted: orphans.length });
};
