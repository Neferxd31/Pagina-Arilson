import { describe, expect, it } from 'vitest';
import { reconcileCart, type CartItem } from '../src/lib/cart';
import type { Product } from '../src/lib/db';
import { jsonForScript } from '../src/lib/format';
import { buildRobotsTxt, buildSitemap, productJsonLd } from '../src/lib/seo';

const line = (overrides: Partial<CartItem>): CartItem => ({
  variantId: 1,
  slug: 'audifonos',
  title: 'Audífonos',
  color: 'Negro',
  price: 50000,
  image: '',
  qty: 2,
  maxStock: 5,
  ...overrides,
});

describe('reconcileCart', () => {
  it('keeps lines that did not change, without notices', () => {
    const result = reconcileCart([line({})], [{ variantId: 1, price: 50000, stock: 5, isActive: true }]);
    expect(result.notices).toEqual([]);
    expect(result.cart[0].qty).toBe(2);
  });

  it('removes hidden, deleted and sold-out products', () => {
    const cart = [line({ variantId: 1 }), line({ variantId: 2, color: 'Blanco' }), line({ variantId: 3, color: 'Azul' })];
    const result = reconcileCart(cart, [
      { variantId: 1, price: 50000, stock: 5, isActive: false },
      { variantId: 3, price: 50000, stock: 0, isActive: true },
    ]);
    expect(result.cart).toEqual([]);
    expect(result.notices).toEqual([
      'Audífonos (Negro) ya no está disponible y se quitó del carrito.',
      'Audífonos (Blanco) ya no está disponible y se quitó del carrito.',
      'Audífonos (Azul) se agotó y se quitó del carrito.',
    ]);
  });

  it('lowers the quantity to the stock left and updates price', () => {
    const result = reconcileCart([line({ qty: 4 })], [{ variantId: 1, price: 55000, stock: 3, isActive: true }]);
    expect(result.cart[0]).toMatchObject({ qty: 3, price: 55000, maxStock: 3 });
    expect(result.notices).toEqual(['Audífonos (Negro): solo quedan 3, ajustamos la cantidad.', 'Audífonos (Negro) cambió de precio.']);
  });
});

describe('seo', () => {
  it('builds a sitemap with escaped URLs', () => {
    const xml = buildSitemap([{ loc: 'https://x.co/productos?categoria=a&b', lastmod: '2026-11-09' }]);
    expect(xml).toContain('<loc>https://x.co/productos?categoria=a&amp;b</loc><lastmod>2026-11-09</lastmod>');
    expect(xml.startsWith('<?xml')).toBe(true);
  });

  it('hides the admin from search engines and points to the sitemap', () => {
    const robots = buildRobotsTxt('https://esencialescol.com');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: https://esencialescol.com/sitemap.xml');
  });

  it('describes a product for Google without breaking the script tag', () => {
    const product = {
      slug: 'audifonos',
      title: 'Audífonos </script><script>alert(1)',
      shortDescription: 'Sonido claro',
      price: 89000,
      variants: [{ stock: 0 }, { stock: 2 }],
    } as unknown as Product;
    const json = productJsonLd(product, { origin: 'https://x.co', imageUrls: ['https://x.co/img/p/1.jpg'] });

    expect(json).not.toContain('</script>');
    const data = JSON.parse(json);
    expect(data.offers).toMatchObject({ price: 89000, priceCurrency: 'COP', availability: 'https://schema.org/InStock' });
    expect(data.image).toEqual(['https://x.co/img/p/1.jpg']);
  });
});

describe('jsonForScript', () => {
  it('keeps data intact but never closes a script tag', () => {
    const json = jsonForScript({ title: 'a</script><b>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual({ title: 'a</script><b>' });
  });
});
