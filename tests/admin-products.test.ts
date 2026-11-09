import { describe, expect, it } from 'vitest';
import { filterAdminProducts, findOrphanImages, parseAdminProductFilters, totalStock } from '../src/lib/admin-products';
import type { Product } from '../src/lib/db';

function product(overrides: Partial<Product> & { stocks: number[] }): Product {
  const { stocks, ...rest } = overrides;
  return {
    id: 1,
    slug: 'p',
    title: 'Producto',
    category: 'celular',
    price: 10000,
    compareAtPrice: null,
    shortDescription: '',
    howToUse: '',
    specs: '',
    warranty: '',
    videoUrl: '',
    tags: [],
    images: [],
    isActive: true,
    isFeatured: false,
    isNew: false,
    variants: stocks.map((stock, index) => ({ id: index + 1, colorName: `Color ${index}`, colorHex: '', imageKey: '', stock })),
    ...rest,
  };
}

const lamp = product({ id: 1, title: 'Lámpara LED', category: 'hogar-oficina', tags: ['escritorio'], stocks: [10] });
const charger = product({ id: 2, title: 'Cargador USB-C', stocks: [0, 2], isFeatured: true });
const hidden = product({ id: 3, title: 'Cable viejo', stocks: [0], isActive: false });
const all = [lamp, charger, hidden];

const filter = (query: string) => filterAdminProducts(all, parseAdminProductFilters(new URLSearchParams(query)));

describe('admin product filters', () => {
  it('shows everything without filters', () => {
    expect(filter('')).toHaveLength(3);
  });

  it('searches title and tags ignoring accents and case', () => {
    expect(filter('q=lampara').map((item) => item.id)).toEqual([1]);
    expect(filter('q=ESCRITORIO').map((item) => item.id)).toEqual([1]);
  });

  it('filters by category and status', () => {
    expect(filter('categoria=celular').map((item) => item.id)).toEqual([2, 3]);
    expect(filter('estado=ocultos').map((item) => item.id)).toEqual([3]);
    expect(filter('estado=agotados').map((item) => item.id)).toEqual([3]);
    expect(filter('estado=stock-bajo').map((item) => item.id)).toEqual([2]);
    expect(filter('estado=destacados').map((item) => item.id)).toEqual([2]);
  });

  it('ignores unknown statuses', () => {
    expect(parseAdminProductFilters(new URLSearchParams('estado=hack')).status).toBe('');
  });

  it('adds up stock across colors', () => {
    expect(totalStock(charger)).toBe(2);
  });
});

describe('findOrphanImages', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const old = new Date('2026-11-01T12:00:00Z');
  const recent = new Date('2026-11-09T11:00:00Z');

  it('returns only old photos that no product uses', () => {
    const objects = [
      { key: 'p/usada.jpg', uploaded: old },
      { key: 'p/huerfana.jpg', uploaded: old },
      { key: 'p/recien-subida.jpg', uploaded: recent },
    ];
    expect(findOrphanImages(objects, new Set(['p/usada.jpg']), now)).toEqual(['p/huerfana.jpg']);
  });
});
