import { asSource, readInteger, readText } from './fields';

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = [
  { id: 'destacados', label: 'Destacados' },
  { id: 'nuevos', label: 'Más nuevos' },
  { id: 'precio-asc', label: 'Precio: menor a mayor' },
  { id: 'precio-desc', label: 'Precio: mayor a menor' },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]['id'];

export interface CatalogFilters {
  search: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  isNew: boolean;
  sort: SortId;
  page: number;
}

const ORDER_BY: Record<SortId, string> = {
  destacados: 'is_featured DESC, created_at DESC, id DESC',
  nuevos: 'created_at DESC, id DESC',
  'precio-asc': 'price ASC, id DESC',
  'precio-desc': 'price DESC, id DESC',
};

function readPrice(value: string | null): number | null {
  if (!value) return null;
  const price = Number(value);
  return Number.isInteger(price) && price >= 0 ? price : null;
}

// Invalid values in the URL are ignored instead of failing, so a broken shared link still shows products
export function parseCatalogFilters(params: URLSearchParams, categorySlugs: string[]): CatalogFilters {
  const category = params.get('categoria') ?? '';
  const sort = params.get('orden') ?? '';
  const page = Number(params.get('pagina'));

  return {
    search: (params.get('q') ?? '').trim().slice(0, 60),
    category: categorySlugs.includes(category) ? category : '',
    minPrice: readPrice(params.get('min')),
    maxPrice: readPrice(params.get('max')),
    inStock: params.get('disponibles') === '1',
    onSale: params.get('oferta') === '1',
    isNew: params.get('nuevos') === '1',
    sort: SORT_OPTIONS.some((option) => option.id === sort) ? (sort as SortId) : 'destacados',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function buildCatalogQuery(filters: CatalogFilters): { where: string; params: (string | number)[]; orderBy: string } {
  const conditions = ['is_active = 1'];
  const params: (string | number)[] = [];

  if (filters.search) {
    conditions.push('(title LIKE ? OR tags LIKE ? OR short_description LIKE ?)');
    const pattern = `%${filters.search}%`;
    params.push(pattern, pattern, pattern);
  }
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }
  if (filters.minPrice !== null) {
    conditions.push('price >= ?');
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    conditions.push('price <= ?');
    params.push(filters.maxPrice);
  }
  if (filters.inStock) conditions.push('EXISTS (SELECT 1 FROM variants v WHERE v.product_id = products.id AND v.stock > 0)');
  if (filters.onSale) conditions.push('compare_at_price IS NOT NULL');
  if (filters.isNew) conditions.push('is_new = 1');

  return { where: `WHERE ${conditions.join(' AND ')}`, params, orderBy: ORDER_BY[filters.sort] };
}

// Builds a /productos link keeping the current filters, used by pagination and "remove filter" chips
export function catalogUrl(filters: CatalogFilters, changes: Partial<CatalogFilters> = {}): string {
  const next = { ...filters, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.search) params.set('q', next.search);
  if (next.category) params.set('categoria', next.category);
  if (next.minPrice !== null) params.set('min', String(next.minPrice));
  if (next.maxPrice !== null) params.set('max', String(next.maxPrice));
  if (next.inStock) params.set('disponibles', '1');
  if (next.onSale) params.set('oferta', '1');
  if (next.isNew) params.set('nuevos', '1');
  if (next.sort !== 'destacados') params.set('orden', next.sort);
  if (next.page > 1) params.set('pagina', String(next.page));

  const query = params.toString();
  return query ? `/productos?${query}` : '/productos';
}

export function validateCategoryInput(body: unknown): { ok: true; name: string; position: number } | { ok: false; errors: string[] } {
  const source = asSource(body);
  const errors: string[] = [];
  const name = readText(source, 'name', 'el nombre de la categoría', { max: 40, required: true }, errors);
  const position = readInteger(source, 'position', 'el orden', { min: 0, max: 999 }, errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, name, position };
}
