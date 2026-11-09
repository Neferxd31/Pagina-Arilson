import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { recordAdminChange } from '../../../../lib/admin-log';
import { validateCategoryInput } from '../../../../lib/catalog';
import { createCategory } from '../../../../lib/db';

export const POST: APIRoute = async (context) => {
  const validation = validateCategoryInput(await context.request.json().catch(() => null));
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  await createCategory(env.DB, validation.name, validation.position);
  await recordAdminChange(context, 'category.create', validation.name);
  return Response.json({ ok: true }, { status: 201 });
};
