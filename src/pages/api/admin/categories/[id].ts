import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCategoryInput } from '../../../../lib/catalog';
import { deleteCategory, listCategories, updateCategory } from '../../../../lib/db';

async function findCategory(id: number) {
  const categories = await listCategories(env.DB);
  return categories.find((category) => category.id === id) ?? null;
}

const notFound = () => Response.json({ errors: ['La categoría no existe.'] }, { status: 404 });

export const PUT: APIRoute = async ({ params, request }) => {
  const category = await findCategory(Number(params.id));
  if (!category) return notFound();

  const validation = validateCategoryInput(await request.json().catch(() => null));
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });

  await updateCategory(env.DB, category.id, validation.name, validation.position);
  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async ({ params }) => {
  const category = await findCategory(Number(params.id));
  if (!category) return notFound();

  // No se borra una categoría con productos: quedarían sin sección en la tienda
  if (category.productCount > 0) {
    const errors = [`"${category.name}" tiene ${category.productCount} producto(s). Muévelos a otra categoría antes de eliminarla.`];
    return Response.json({ errors }, { status: 409 });
  }

  await deleteCategory(env.DB, category.id);
  return Response.json({ ok: true });
};
