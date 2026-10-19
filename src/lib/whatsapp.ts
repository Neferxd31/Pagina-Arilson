import { formatPrice } from './format';
import type { Customer, OrderLine } from './orders';

export function buildOrderMessage(code: string, lines: OrderLine[], total: number, customer: Customer): string {
  const itemLines = lines.map(
    (line) => `• ${line.qty} x ${line.title} (${line.color}) — ${formatPrice(line.subtotal)}`,
  );

  const parts = [
    '¡Hola EsencialesCol! Quiero hacer este pedido:',
    '',
    `*Pedido ${code}*`,
    ...itemLines,
    '',
    `*Total productos: ${formatPrice(total)}*`,
    '',
    `Nombre: ${customer.name}`,
    `Ciudad: ${customer.city}`,
    `Dirección: ${customer.address}`,
  ];
  if (customer.notes) parts.push(`Notas: ${customer.notes}`);
  parts.push('', 'Quedo atento(a) para coordinar el envío y el pago.');

  return parts.join('\n');
}

export function buildContactMessage(name: string, message: string): string {
  return `¡Hola EsencialesCol! Soy ${name.trim()}.\n\n${message.trim()}`;
}

export function whatsappUrl(phoneNumber: string, message: string): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}
