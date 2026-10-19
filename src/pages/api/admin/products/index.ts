import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createProduct, listCategories } from '../../../../lib/db';
import { validateProductInput } from '../../../../lib/product-input';

export const POST: APIRoute = async ({ request }) => {
  const categories = await listCategories(env.DB);
  const validation = validateProductInput(
    await request.json().catch(() => null),
    categories.map((category) => category.slug),
  );
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  const id = await createProduct(env.DB, validation.value);
  return Response.json({ id }, { status: 201 });
};
