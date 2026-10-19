import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '../src/lib/format';
import { validateProductInput } from '../src/lib/product-input';
import { videoEmbedUrl } from '../src/lib/video';

const categorySlugs = ['celular', 'tecnologia-personal', 'hogar-oficina'];

const imageKey = 'p/0b6c1f9e-2f5a-4f0e-9d0e-7a1b2c3d4e5f.jpg';

const validProduct = {
  title: 'Audífonos Bluetooth',
  category: 'tecnologia-personal',
  price: 89000,
  compareAtPrice: 120000,
  shortDescription: 'Sonido claro todo el día',
  tags: 'Deporte, hogar',
  images: [imageKey],
  isActive: true,
  variants: [
    { colorName: 'Negro', colorHex: '#000000', imageKey, stock: 5 },
    { id: 4, colorName: 'Blanco', colorHex: '#ffffff', stock: 0 },
  ],
};

describe('validateProductInput', () => {
  it('accepts a complete product', () => {
    const result = validateProductInput(validProduct, categorySlugs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tags).toEqual(['deporte', 'hogar']);
    expect(result.value.variants[0].id).toBeNull();
    expect(result.value.variants[1].id).toBe(4);
    expect(result.value.isFeatured).toBe(false);
    expect(result.value.isNew).toBe(false);
  });

  it('accepts categories created by the admin', () => {
    const result = validateProductInput({ ...validProduct, category: 'belleza' }, [...categorySlugs, 'belleza']);
    expect(result.ok).toBe(true);
  });

  it('requires title, valid category, price and at least one color', () => {
    const result = validateProductInput({ title: ' ', category: 'otra', price: 0, variants: [] }, categorySlugs);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Falta el título.',
        'Elige una categoría válida.',
        'Agrega al menos un color (o "Único" si no tiene colores).',
      ]),
    );
  });

  it('rejects a previous price lower than the current one', () => {
    const result = validateProductInput({ ...validProduct, compareAtPrice: 50000 }, categorySlugs);
    expect(result.ok).toBe(false);
  });

  it('rejects negative stock, repeated colors and foreign images', () => {
    const result = validateProductInput(
      {
        ...validProduct,
        variants: [
          { colorName: 'Negro', stock: -1 },
          { colorName: 'negro', stock: 1, imageKey: 'p/../../secret.jpg' },
        ],
      },
      categorySlugs,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('Hay colores repetidos.');
    expect(result.errors.some((error) => error.includes('stock'))).toBe(true);
    expect(result.errors.some((error) => error.includes('foto'))).toBe(true);
  });

  it('rejects overly long texts', () => {
    const result = validateProductInput({ ...validProduct, shortDescription: 'a'.repeat(301) }, categorySlugs);
    expect(result.ok).toBe(false);
  });
});

describe('slugs', () => {
  it('builds readable URLs without accents', () => {
    expect(slugify('Lámpara LED Recargable 3 en 1!')).toBe('lampara-led-recargable-3-en-1');
    expect(slugify('¡¡¡')).toBe('producto');
  });

  it('avoids collisions', () => {
    expect(uniqueSlug('audifonos', [])).toBe('audifonos');
    expect(uniqueSlug('audifonos', ['audifonos', 'audifonos-2'])).toBe('audifonos-3');
  });
});

describe('videoEmbedUrl', () => {
  it('embeds TikTok and Instagram links', () => {
    expect(videoEmbedUrl('https://www.tiktok.com/@esencialescolomarilson/video/7412345678901234567')).toBe(
      'https://www.tiktok.com/embed/v2/7412345678901234567',
    );
    expect(videoEmbedUrl('https://www.instagram.com/reel/C9abc_12-x/?igsh=1')).toBe('https://www.instagram.com/p/C9abc_12-x/embed');
  });

  it('returns null for links it cannot embed', () => {
    expect(videoEmbedUrl('https://vt.tiktok.com/ZSabc/')).toBeNull();
  });
});
