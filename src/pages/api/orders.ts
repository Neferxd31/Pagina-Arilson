import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { STORE } from '../../config';
import { createOrder, getVariantsForOrder } from '../../lib/db';
import { orderCode, parseOrderRequest, priceOrder } from '../../lib/orders';
import { DEV_TEST_SECRET, verifyTurnstile } from '../../lib/turnstile';
import { buildOrderMessage, whatsappUrl } from '../../lib/whatsapp';

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { turnstileToken?: unknown } | null;
  const parsed = parseOrderRequest(body);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });

  // Sin la clave secreta en producción se rechaza el pedido: mejor avisar que dejar la protección apagada
  const secret = env.TURNSTILE_SECRET_KEY ?? (import.meta.env.DEV ? DEV_TEST_SECRET : '');
  const token = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';
  const isHuman = await verifyTurnstile(token, secret, request.headers.get('cf-connecting-ip'));
  if (!isHuman) {
    return Response.json({ errors: ['No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo.'] }, { status: 403 });
  }

  const variants = await getVariantsForOrder(
    env.DB,
    parsed.items.map((item) => item.variantId),
  );
  const priced = priceOrder(parsed.items, variants);
  if (!priced.ok) return Response.json({ errors: priced.errors }, { status: 409 });

  const { customer } = parsed;
  const orderId = await createOrder(env.DB, {
    customerName: customer.name,
    city: customer.city,
    address: customer.address,
    notes: customer.notes,
    items: priced.lines,
    total: priced.total,
  });

  const message = buildOrderMessage(orderCode(orderId), priced.lines, priced.total, customer);
  return Response.json({ whatsappUrl: whatsappUrl(STORE.whatsappNumber, message) });
};
