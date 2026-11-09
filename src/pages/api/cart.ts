import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getVariantsForOrder } from '../../lib/db';

const MAX_VARIANTS = 50;

// Current price and stock of the colors in a visitor's cart, so the cart page never shows stale data
export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { variantIds?: unknown } | null;
  const ids = Array.isArray(body?.variantIds) ? body.variantIds : [];
  const variantIds = ids.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, MAX_VARIANTS);
  if (variantIds.length === 0) return Response.json({ variants: [] });

  const variants = await getVariantsForOrder(env.DB, variantIds);
  return Response.json({
    variants: variants.map(({ variantId, price, stock, isActive }) => ({ variantId, price, stock, isActive })),
  });
};
