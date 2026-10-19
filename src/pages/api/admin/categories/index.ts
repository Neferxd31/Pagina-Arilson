import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCategoryInput } from '../../../../lib/catalog';
import { createCategory } from '../../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const validation = validateCategoryInput(await request.json().catch(() => null));
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  await createCategory(env.DB, validation.name, validation.position);
  return Response.json({ ok: true }, { status: 201 });
};
