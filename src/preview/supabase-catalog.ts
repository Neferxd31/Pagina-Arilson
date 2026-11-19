import bundledCatalog from './catalog.json';

export const CATEGORIES = {
  audio: 'Audio',
  'tecnologia-personal': 'Tecnología personal',
  'carga-y-conectividad': 'Carga y conectividad',
  gaming: 'Gaming',
  'gadgets-y-accesorios': 'Gadgets y accesorios',
};

export interface CatalogRecord {
  id: number;
  slug: string;
  title: string;
  category: string;
  description: string;
  note: string;
  price: number | null;
  suggested_price: number | null;
  price_tiers: { quantity: number; unitPrice: number }[];
  featured: boolean;
}

const positiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

function isCatalogRecord(value: unknown): value is CatalogRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<CatalogRecord>;
  return positiveInteger(row.id) &&
    typeof row.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) &&
    typeof row.title === 'string' && typeof row.category === 'string' && Object.hasOwn(CATEGORIES, row.category) &&
    typeof row.description === 'string' && typeof row.note === 'string' && typeof row.featured === 'boolean' &&
    (row.price === null || positiveInteger(row.price)) &&
    (row.suggested_price === null || positiveInteger(row.suggested_price)) &&
    Array.isArray(row.price_tiers) && row.price_tiers.every((tier) =>
      tier && positiveInteger(tier.quantity) && positiveInteger(tier.unitPrice),
    );
}

export async function loadCatalog(): Promise<CatalogRecord[]> {
  const url = process.env.VITE_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return bundledCatalog;

  try {
    const endpoint = new URL('/rest/v1/esencialescol_catalog', url);
    if (endpoint.protocol !== 'https:' || !key.startsWith('sb_publishable_')) throw new Error('Configuración inválida');
    endpoint.searchParams.set('select', 'id,slug,title,category,description,note,price,suggested_price,price_tiers,featured');
    endpoint.searchParams.set('order', 'id.asc');
    const response = await fetch(endpoint, { headers: { apikey: key }, signal: AbortSignal.timeout(3500) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || !rows.every(isCatalogRecord)) throw new Error('Datos inválidos');
    return rows;
  } catch (error) {
    console.warn('Supabase no está disponible. Se usará la copia del catálogo.', error instanceof Error && error.name === 'TimeoutError' ? 'Tiempo de espera agotado' : undefined);
    return bundledCatalog;
  }
}
