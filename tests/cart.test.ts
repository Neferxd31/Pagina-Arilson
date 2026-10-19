import { describe, expect, it } from 'vitest';
import { addToCart, cartCount, cartTotal, removeFromCart, setCartQty, type CartItem } from '../src/lib/cart';

const black = { variantId: 1, slug: 'audifonos', title: 'Audífonos', color: 'Negro', price: 50000, image: '', maxStock: 3 };
const white = { ...black, variantId: 2, color: 'Blanco', price: 55000, maxStock: 10 };

describe('cart', () => {
  it('adds a new line and accumulates the same color', () => {
    let cart: CartItem[] = addToCart([], black, 1);
    cart = addToCart(cart, black, 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].qty).toBe(2);
  });

  it('keeps each color as its own line', () => {
    const cart = addToCart(addToCart([], black, 1), white, 2);
    expect(cart).toHaveLength(2);
    expect(cartCount(cart)).toBe(3);
  });

  it('never exceeds the available stock', () => {
    let cart = addToCart([], black, 5);
    expect(cart[0].qty).toBe(3);
    cart = addToCart(cart, black, 1);
    expect(cart[0].qty).toBe(3);
    expect(setCartQty(cart, 1, 99)[0].qty).toBe(3);
  });

  it('does not add out-of-stock colors', () => {
    expect(addToCart([], { ...black, maxStock: 0 }, 1)).toEqual([]);
  });

  it('removes a line when quantity goes to zero', () => {
    const cart = addToCart([], black, 2);
    expect(setCartQty(cart, 1, 0)).toEqual([]);
    expect(removeFromCart(cart, 1)).toEqual([]);
  });

  it('computes the total', () => {
    const cart = addToCart(addToCart([], black, 2), white, 1);
    expect(cartTotal(cart)).toBe(155000);
  });
});
