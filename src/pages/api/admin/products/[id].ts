import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { recordAdminChange } from '../../../../lib/admin-log';
import { deleteProduct, getProductById, listCategories, updateProduct } from '../../../../lib/db';
import { validateProductInput } from '../../../../lib/product-input';

const notFound = () => Response.json({ errors: ['El producto no existe.'] }, { status: 404 });

export const PUT: APIRoute = async (context) => {
  const id = Number(context.params.id);
  const current = await getProductById(env.DB, id);
  if (!current) return notFound();

  const categories = await listCategories(env.DB);
  const validation = validateProductInput(
    await context.request.json().catch(() => null),
    categories.map((category) => category.slug),
  );
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  await updateProduct(env.DB, id, validation.value);
  await recordAdminChange(context, 'product.update', validation.value.title);

  // Free R2 space from photos the admin removed in this edit
  const removedImages = current.images.filter((key) => !validation.value.images.includes(key));
  if (removedImages.length > 0) await env.MEDIA.delete(removedImages);

  return Response.json({ id });
};

export const DELETE: APIRoute = async (context) => {
  const id = Number(context.params.id);
  const current = await getProductById(env.DB, id);
  if (!current) return notFound();

  await deleteProduct(env.DB, id);
  await recordAdminChange(context, 'product.delete', current.title);
  if (current.images.length > 0) await env.MEDIA.delete(current.images);

  return Response.json({ id });
};
