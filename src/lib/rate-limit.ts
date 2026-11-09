// Máximo de pedidos que una misma conexión puede registrar en una hora
export const ORDER_LIMIT_PER_HOUR = 5;

export function isOverOrderLimit(ordersInLastHour: number): boolean {
  return ordersInLastHour >= ORDER_LIMIT_PER_HOUR;
}

// The IP is never stored: only a salted SHA-256 fingerprint, deleted after one hour
export async function hashClientIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
