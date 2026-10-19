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
