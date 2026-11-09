import type { Product } from './db';

// Desde cuántas unidades por color se considera "stock bajo" en el admin
export const LOW_STOCK_THRESHOLD = 3;

export const ADMIN_STATUS_OPTIONS = [
  { id: '', label: 'Todos' },
  { id: 'visibles', label: 'Visibles' },
  { id: 'ocultos', label: 'Ocultos' },
  { id: 'agotados', label: 'Agotados' },
  { id: 'stock-bajo', label: 'Stock bajo' },
  { id: 'destacados', label: 'Destacados' },
] as const;

export type AdminProductStatus = (typeof ADMIN_STATUS_OPTIONS)[number]['id'];

export interface AdminProductFilters {
  search: string;
  category: string;
  status: AdminProductStatus;
}

export function parseAdminProductFilters(params: URLSearchParams): AdminProductFilters {
  const status = params.get('estado') ?? '';
  return {
    search: (params.get('q') ?? '').trim().slice(0, 60),
    category: params.get('categoria') ?? '',
    status: ADMIN_STATUS_OPTIONS.some((option) => option.id === status) ? (status as AdminProductStatus) : '',
  };
}

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

function hasLowStock(product: Product): boolean {
  return product.variants.some((variant) => variant.stock > 0 && variant.stock <= LOW_STOCK_THRESHOLD);
}

// Ignore case and accents so "lampara" finds "Lámpara"
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const STATUS_MATCHERS: Record<AdminProductStatus, (product: Product) => boolean> = {
  '': () => true,
  visibles: (product) => product.isActive,
  ocultos: (product) => !product.isActive,
  agotados: (product) => totalStock(product) === 0,
  'stock-bajo': hasLowStock,
  destacados: (product) => product.isFeatured,
};

export function filterAdminProducts(products: Product[], filters: AdminProductFilters): Product[] {
  const search = normalize(filters.search);
  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (search && !normalize(`${product.title} ${product.tags.join(' ')}`).includes(search)) return false;
    return STATUS_MATCHERS[filters.status](product);
  });
}

// Fotos que nadie usa. Las recién subidas se respetan un día: pueden ser de un producto que se está creando ahora
export function findOrphanImages(
  objects: { key: string; uploaded: Date }[],
  usedKeys: Set<string>,
  now: Date,
  minAgeMs = 24 * 60 * 60 * 1000,
): string[] {
  return objects
    .filter((object) => !usedKeys.has(object.key) && now.getTime() - object.uploaded.getTime() >= minAgeMs)
    .map((object) => object.key);
}
