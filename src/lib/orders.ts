import { asSource, readInteger, readText } from './fields';

export interface OrderRequestItem {
  variantId: number;
  qty: number;
}

export interface Customer {
  name: string;
  city: string;
  address: string;
  notes: string;
}

export interface VariantForOrder {
  variantId: number;
  title: string;
  colorName: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface OrderLine {
  variantId: number;
  title: string;
  color: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

type Result<T> = ({ ok: true } & T) | { ok: false; errors: string[] };

const MAX_LINES = 50;
const MAX_QTY = 999;

export function parseOrderRequest(body: unknown): Result<{ items: OrderRequestItem[]; customer: Customer }> {
  const source = asSource(body);
  const errors: string[] = [];

  const customerSource = asSource(source.customer);
  const customer: Customer = {
    name: readText(customerSource, 'name', 'el nombre', { max: 80, required: true }, errors),
    city: readText(customerSource, 'city', 'la ciudad', { max: 60, required: true }, errors),
    address: readText(customerSource, 'address', 'la dirección', { max: 160, required: true }, errors),
    notes: readText(customerSource, 'notes', 'las notas', { max: 300 }, errors),
  };

  const rawItems = Array.isArray(source.items) ? source.items : [];
  if (rawItems.length === 0) errors.push('El carrito está vacío.');
  if (rawItems.length > MAX_LINES) errors.push(`El pedido no puede tener más de ${MAX_LINES} productos distintos.`);

  const quantities = new Map<number, number>();
  for (const rawItem of rawItems.slice(0, MAX_LINES)) {
    const itemSource = asSource(rawItem);
    const variantId = readInteger(itemSource, 'variantId', 'el producto', { min: 1, max: Number.MAX_SAFE_INTEGER }, errors);
    const qty = readInteger(itemSource, 'qty', 'la cantidad', { min: 1, max: MAX_QTY }, errors);
    quantities.set(variantId, (quantities.get(variantId) ?? 0) + qty);
  }

  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };

  const items = [...quantities].map(([variantId, qty]) => ({ variantId, qty }));
  return { ok: true, items, customer };
}

// El precio siempre sale de la base de datos; el carrito del navegador solo aporta cantidades
export function priceOrder(items: OrderRequestItem[], variants: VariantForOrder[]): Result<{ lines: OrderLine[]; total: number }> {
  const byId = new Map(variants.map((variant) => [variant.variantId, variant]));
  const errors: string[] = [];
  const lines: OrderLine[] = [];

  for (const item of items) {
    const variant = byId.get(item.variantId);
    if (!variant || !variant.isActive) {
      errors.push('Uno de los productos ya no está disponible. Retíralo del carrito.');
      continue;
    }
    if (item.qty > variant.stock) {
      const available = variant.stock === 0 ? 'está agotado' : `solo quedan ${variant.stock}`;
      errors.push(`${variant.title} (${variant.colorName}): ${available}.`);
      continue;
    }
    lines.push({
      variantId: variant.variantId,
      title: variant.title,
      color: variant.colorName,
      qty: item.qty,
      unitPrice: variant.price,
      subtotal: variant.price * item.qty,
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, lines, total: lines.reduce((sum, line) => sum + line.subtotal, 0) };
}

// El stock baja solo cuando el admin confirma, porque no todo chat de WhatsApp termina en compra
export function stockChanges(lines: OrderLine[], from: OrderStatus, to: OrderStatus): { variantId: number; delta: number }[] | null {
  if (from === 'pending' && to === 'confirmed') return lines.map((line) => ({ variantId: line.variantId, delta: -line.qty }));
  if (from === 'pending' && to === 'cancelled') return [];
  if (from === 'confirmed' && to === 'cancelled') return lines.map((line) => ({ variantId: line.variantId, delta: line.qty }));
  return null;
}

export function orderCode(id: number): string {
  return `EC-${String(id).padStart(4, '0')}`;
}
