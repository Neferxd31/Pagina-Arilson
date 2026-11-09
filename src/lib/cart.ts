export interface CartItem {
  variantId: number;
  slug: string;
  title: string;
  color: string;
  price: number;
  image: string;
  qty: number;
  maxStock: number;
}

function clampQty(qty: number, maxStock: number): number {
  return Math.min(Math.max(Math.floor(qty), 1), maxStock);
}

export function addToCart(cart: CartItem[], item: Omit<CartItem, 'qty'>, qty: number): CartItem[] {
  if (item.maxStock < 1 || qty < 1) return cart;

  const existing = cart.find((line) => line.variantId === item.variantId);
  if (!existing) return [...cart, { ...item, qty: clampQty(qty, item.maxStock) }];

  // Refresh price and stock with the latest values seen on the product page
  const nextQty = clampQty(existing.qty + qty, item.maxStock);
  return cart.map((line) => (line.variantId === item.variantId ? { ...item, qty: nextQty } : line));
}

export function setCartQty(cart: CartItem[], variantId: number, qty: number): CartItem[] {
  if (qty < 1) return removeFromCart(cart, variantId);
  return cart.map((line) => (line.variantId === variantId ? { ...line, qty: clampQty(qty, line.maxStock) } : line));
}

export function removeFromCart(cart: CartItem[], variantId: number): CartItem[] {
  return cart.filter((line) => line.variantId !== variantId);
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, line) => sum + line.qty, 0);
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, line) => sum + line.qty * line.price, 0);
}

export interface FreshVariant {
  variantId: number;
  price: number;
  stock: number;
  isActive: boolean;
}

// Al abrir el carrito se comparan los productos guardados con los datos actuales de la tienda
export function reconcileCart(cart: CartItem[], fresh: FreshVariant[]): { cart: CartItem[]; notices: string[] } {
  const byId = new Map(fresh.map((variant) => [variant.variantId, variant]));
  const notices: string[] = [];
  const next: CartItem[] = [];

  for (const line of cart) {
    const label = `${line.title} (${line.color})`;
    const variant = byId.get(line.variantId);

    if (!variant || !variant.isActive) {
      notices.push(`${label} ya no está disponible y se quitó del carrito.`);
      continue;
    }
    if (variant.stock === 0) {
      notices.push(`${label} se agotó y se quitó del carrito.`);
      continue;
    }

    const qty = Math.min(line.qty, variant.stock);
    if (qty < line.qty) notices.push(`${label}: solo quedan ${variant.stock}, ajustamos la cantidad.`);
    if (variant.price !== line.price) notices.push(`${label} cambió de precio.`);
    next.push({ ...line, qty, price: variant.price, maxStock: variant.stock });
  }

  return { cart: next, notices };
}
