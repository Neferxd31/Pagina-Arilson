import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { recordAdminChange } from '../../../../lib/admin-log';
import { validateCategoryInput } from '../../../../lib/catalog';
import { deleteCategory, listCategories, updateCategory } from '../../../../lib/db';

async function findCategory(id: number) {
  const categories = await listCategories(env.DB);
  return categories.find((category) => category.id === id) ?? null;
}

const notFound = () => Response.json({ errors: ['La categoría no existe.'] }, { status: 404 });

export const PUT: APIRoute = async (context) => {
  const category = await findCategory(Number(context.params.id));
  if (!category) return notFound();

  const validation = validateCategoryInput(await context.request.json().catch(() => null));
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  await updateCategory(env.DB, category.id, validation.name, validation.position);
  await recordAdminChange(context, 'category.update', validation.name);
  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async (context) => {
  const category = await findCategory(Number(context.params.id));
  if (!category) return notFound();

  // No se borra una categoría con productos: quedarían sin sección en la tienda
  if (category.productCount > 0) {
    const errors = [`"${category.name}" tiene ${category.productCount} producto(s). Muévelos a otra categoría antes de eliminarla.`];
    return Response.json({ errors }, { status: 409 });
  }

  await deleteCategory(env.DB, category.id);
  await recordAdminChange(context, 'category.delete', category.name);
  return Response.json({ ok: true });
};
