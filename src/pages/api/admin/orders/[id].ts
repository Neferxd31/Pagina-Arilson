import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { recordAdminChange } from '../../../../lib/admin-log';
import { getOrder, getVariantsForOrder, setOrderStatus } from '../../../../lib/db';
import { orderCode, stockChanges, type OrderStatus } from '../../../../lib/orders';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'cancelled'];

export const PATCH: APIRoute = async (context) => {
  const order = await getOrder(env.DB, Number(context.params.id));
  if (!order) return Response.json({ errors: ['El pedido no existe.'] }, { status: 404 });

  const body = (await context.request.json().catch(() => null)) as { status?: OrderStatus } | null;
  const status = body?.status;
  if (!status || !STATUSES.includes(status)) return Response.json({ errors: ['Estado inválido.'] }, { status: 400 });

  const changes = stockChanges(order.items, order.status, status);
  if (changes === null) return Response.json({ errors: ['Ese cambio de estado no está permitido.'] }, { status: 409 });

  // Al confirmar se descuenta stock: avisar si ya no alcanza en vez de vender de más
  if (status === 'confirmed') {
    const variants = await getVariantsForOrder(env.DB, order.items.map((item) => item.variantId));
    const shortages = order.items
      .filter((item) => (variants.find((variant) => variant.variantId === item.variantId)?.stock ?? 0) < item.qty)
      .map((item) => `${item.title} (${item.color}): no hay stock suficiente para ${item.qty}.`);
    if (shortages.length > 0) return Response.json({ errors: shortages }, { status: 409 });
  }

  await setOrderStatus(env.DB, order.id, status, changes);
  await recordAdminChange(context, status === 'confirmed' ? 'order.confirmed' : 'order.cancelled', orderCode(order.id));
  return Response.json({ id: order.id, status });
};
