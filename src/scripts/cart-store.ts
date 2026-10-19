import { cartCount, type CartItem } from '../lib/cart';

const STORAGE_KEY = 'esencialescol-cart';

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Private mode or blocked storage: the cart still works for this page view
  }
  updateCartBadge(cart);
}

export function updateCartBadge(cart: CartItem[] = loadCart()): void {
  const count = cartCount(cart);
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((badge) => {
    // Bump only when products are added, not on page load or when removing
    const grew = !badge.hidden && count > Number(badge.textContent);
    badge.textContent = String(count);
    badge.hidden = count === 0;
    if (!grew) return;
    badge.classList.remove('bump');
    // Force a reflow so the animation restarts on every add
    void badge.offsetWidth;
    badge.classList.add('bump');
  });
}
