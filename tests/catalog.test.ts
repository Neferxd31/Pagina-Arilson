import { describe, expect, it } from 'vitest';
import { buildCatalogQuery, catalogUrl, parseCatalogFilters, validateCategoryInput } from '../src/lib/catalog';

const categorySlugs = ['celular', 'hogar-oficina'];
const parse = (query: string) => parseCatalogFilters(new URLSearchParams(query), categorySlugs);

describe('parseCatalogFilters', () => {
  it('uses safe defaults for an empty URL', () => {
    expect(parse('')).toEqual({
      search: '',
      category: '',
      minPrice: null,
      maxPrice: null,
      inStock: false,
      onSale: false,
      sort: 'destacados',
      page: 1,
    });
  });

  it('reads every filter', () => {
    expect(parse('q=audifonos&categoria=celular&min=10000&max=90000&disponibles=1&oferta=1&orden=precio-asc&pagina=3')).toEqual({
      search: 'audifonos',
      category: 'celular',
      minPrice: 10000,
      maxPrice: 90000,
      inStock: true,
      onSale: true,
      sort: 'precio-asc',
      page: 3,
    });
  });

  it('ignores unknown categories, sorts, prices and pages', () => {
    const filters = parse('categoria=no-existe&orden=hack&min=-5&max=abc&pagina=0');
    expect(filters.category).toBe('');
    expect(filters.sort).toBe('destacados');
    expect(filters.minPrice).toBeNull();
    expect(filters.maxPrice).toBeNull();
    expect(filters.page).toBe(1);
  });
});

describe('buildCatalogQuery', () => {
  it('only shows visible products by default', () => {
    expect(buildCatalogQuery(parse(''))).toEqual({
      where: 'WHERE is_active = 1',
      params: [],
      orderBy: 'is_featured DESC, created_at DESC, id DESC',
    });
  });

  it('combines filters with bound parameters', () => {
    const query = buildCatalogQuery(parse('q=led&categoria=hogar-oficina&min=1000&disponibles=1&oferta=1&orden=precio-desc'));
    expect(query.where).toContain('title LIKE ?');
    expect(query.where).toContain('category = ?');
    expect(query.where).toContain('price >= ?');
    expect(query.where).toContain('v.stock > 0');
    expect(query.where).toContain('compare_at_price IS NOT NULL');
    expect(query.params).toEqual(['%led%', '%led%', '%led%', 'hogar-oficina', 1000]);
    expect(query.orderBy).toBe('price DESC, id DESC');
  });
});

describe('catalogUrl', () => {
  it('keeps filters and resets the page when a filter changes', () => {
    const filters = parse('q=led&categoria=celular&pagina=4');
    expect(catalogUrl(filters, { page: 5 })).toBe('/productos?q=led&categoria=celular&pagina=5');
    expect(catalogUrl(filters, { category: '' })).toBe('/productos?q=led');
    expect(catalogUrl(parse(''))).toBe('/productos');
  });
});

describe('validateCategoryInput', () => {
  it('requires a name and a valid order', () => {
    expect(validateCategoryInput({ name: ' Belleza ', position: 4 })).toEqual({ ok: true, name: 'Belleza', position: 4 });
    expect(validateCategoryInput({ name: '', position: -1 }).ok).toBe(false);
  });
});
