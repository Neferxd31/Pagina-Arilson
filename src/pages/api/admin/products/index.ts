import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { recordAdminChange } from '../../../../lib/admin-log';
import { createProduct, listCategories } from '../../../../lib/db';
import { validateProductInput } from '../../../../lib/product-input';

export const POST: APIRoute = async (context) => {
  const categories = await listCategories(env.DB);
  const validation = validateProductInput(
    await context.request.json().catch(() => null),
    categories.map((category) => category.slug),
  );
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  const id = await createProduct(env.DB, validation.value);
  await recordAdminChange(context, 'product.create', validation.value.title);
  return Response.json({ id }, { status: 201 });
};
