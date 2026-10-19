import { describe, expect, it } from 'vitest';
import { orderCode, parseOrderRequest, priceOrder, stockChanges, type VariantForOrder } from '../src/lib/orders';
import { buildContactMessage, buildOrderMessage, whatsappUrl } from '../src/lib/whatsapp';

const customer = { name: 'Ana Pérez', city: 'Cúcuta', address: 'Calle 10 #5-20, Barrio Centro', notes: '' };

const variants: VariantForOrder[] = [
  { variantId: 1, title: 'Audífonos', colorName: 'Negro', price: 50000, stock: 3, isActive: true },
  { variantId: 2, title: 'Cargador', colorName: 'Único', price: 30000, stock: 0, isActive: true },
  { variantId: 3, title: 'Lámpara', colorName: 'Blanco', price: 40000, stock: 5, isActive: false },
];

describe('parseOrderRequest', () => {
  it('accepts a valid request and merges repeated colors', () => {
    const result = parseOrderRequest({ customer, items: [{ variantId: 1, qty: 1 }, { variantId: 1, qty: 2 }] });
    expect(result).toEqual({ ok: true, customer, items: [{ variantId: 1, qty: 3 }] });
  });

  it('rejects an empty cart and missing customer data', () => {
    const result = parseOrderRequest({ customer: { name: '' }, items: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('El carrito está vacío.');
    expect(result.errors).toContain('Falta el nombre.');
    expect(result.errors).toContain('Falta la dirección.');
  });

  it('rejects invalid quantities', () => {
    const result = parseOrderRequest({ customer, items: [{ variantId: 1, qty: 0 }] });
    expect(result.ok).toBe(false);
  });

  it('rejects garbage bodies', () => {
    expect(parseOrderRequest(null).ok).toBe(false);
    expect(parseOrderRequest('hola').ok).toBe(false);
  });
});

describe('priceOrder', () => {
  it('uses database prices, not the client ones', () => {
    const result = priceOrder([{ variantId: 1, qty: 2 }], variants);
    expect(result).toEqual({
      ok: true,
      total: 100000,
      lines: [{ variantId: 1, title: 'Audífonos', color: 'Negro', qty: 2, unitPrice: 50000, subtotal: 100000 }],
    });
  });

  it('rejects quantities above stock', () => {
    const result = priceOrder([{ variantId: 1, qty: 4 }], variants);
    expect(result).toEqual({ ok: false, errors: ['Audífonos (Negro): solo quedan 3.'] });
  });

  it('rejects sold-out, hidden and unknown products', () => {
    const result = priceOrder(
      [
        { variantId: 2, qty: 1 },
        { variantId: 3, qty: 1 },
        { variantId: 99, qty: 1 },
      ],
      variants,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toBe('Cargador (Único): está agotado.');
    expect(result.errors).toHaveLength(3);
  });
});

describe('stockChanges', () => {
  const lines = [{ variantId: 1, title: 'Audífonos', color: 'Negro', qty: 2, unitPrice: 50000, subtotal: 100000 }];

  it('discounts stock only when confirming', () => {
    expect(stockChanges(lines, 'pending', 'confirmed')).toEqual([{ variantId: 1, delta: -2 }]);
    expect(stockChanges(lines, 'pending', 'cancelled')).toEqual([]);
  });

  it('returns stock when a confirmed order is cancelled', () => {
    expect(stockChanges(lines, 'confirmed', 'cancelled')).toEqual([{ variantId: 1, delta: 2 }]);
  });

  it('rejects invalid transitions', () => {
    expect(stockChanges(lines, 'cancelled', 'confirmed')).toBeNull();
    expect(stockChanges(lines, 'confirmed', 'confirmed')).toBeNull();
  });
});

describe('whatsapp message', () => {
  it('lists every product, the total and the customer data', () => {
    const lines = [
      { variantId: 1, title: 'Audífonos', color: 'Negro', qty: 2, unitPrice: 50000, subtotal: 100000 },
      { variantId: 4, title: 'Soporte', color: 'Gris', qty: 1, unitPrice: 25000, subtotal: 25000 },
    ];
    const message = buildOrderMessage(orderCode(7), lines, 125000, { ...customer, notes: 'Entregar en la tarde' });

    expect(message).toContain('*Pedido EC-0007*');
    expect(message).toContain('• 2 x Audífonos (Negro) — $ 100.000');
    expect(message).toContain('• 1 x Soporte (Gris) — $ 25.000');
    expect(message).toContain('*Total productos: $ 125.000*');
    expect(message).toContain('Dirección: Calle 10 #5-20, Barrio Centro');
    expect(message).toContain('Notas: Entregar en la tarde');
  });

  it('builds the contact message with the name and the text', () => {
    expect(buildContactMessage(' Ana ', ' ¿Tienen cargadores USB-C? ')).toBe(
      '¡Hola EsencialesCol! Soy Ana.\n\n¿Tienen cargadores USB-C?',
    );
  });

  it('builds an encoded wa.me link', () => {
    const url = whatsappUrl('573223381876', 'Hola #1 & más');
    expect(url).toBe('https://wa.me/573223381876?text=Hola%20%231%20%26%20m%C3%A1s');
  });
});
