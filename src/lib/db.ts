import { buildCatalogQuery, PAGE_SIZE, type CatalogFilters } from './catalog';
import { slugify, uniqueSlug } from './format';
import type { OrderLine, OrderStatus, VariantForOrder } from './orders';
import type { ProductInput } from './product-input';

export interface Variant {
  id: number;
  colorName: string;
  colorHex: string;
  imageKey: string;
  stock: number;
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  shortDescription: string;
  howToUse: string;
  specs: string;
  warranty: string;
  videoUrl: string;
  tags: string[];
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  variants: Variant[];
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  position: number;
  productCount: number;
}

export type HomeSection = 'featured' | 'new' | 'sale';

export interface Order {
  id: number;
  customerName: string;
  city: string;
  address: string;
  notes: string;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

interface ProductRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  short_description: string;
  how_to_use: string;
  specs: string;
  warranty: string;
  video_url: string;
  tags: string;
  images: string;
  is_active: number;
  is_featured: number;
  is_new: number;
}

interface VariantRow {
  id: number;
  product_id: number;
  color_name: string;
  color_hex: string;
  image_key: string;
  stock: number;
}

interface OrderRow {
  id: number;
  customer_name: string;
  city: string;
  address: string;
  notes: string;
  items: string;
  total: number;
  status: OrderStatus;
  created_at: string;
}

function toVariant(row: VariantRow): Variant {
  return { id: row.id, colorName: row.color_name, colorHex: row.color_hex, imageKey: row.image_key, stock: row.stock };
}

function toProduct(row: ProductRow, variants: VariantRow[]): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    shortDescription: row.short_description,
    howToUse: row.how_to_use,
    specs: row.specs,
    warranty: row.warranty,
    videoUrl: row.video_url,
    tags: row.tags ? row.tags.split(',') : [],
    images: JSON.parse(row.images) as string[],
    isActive: row.is_active === 1,
    isFeatured: row.is_featured === 1,
    isNew: row.is_new === 1,
    variants: variants.filter((variant) => variant.product_id === row.id).map(toVariant),
  };
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerName: row.customer_name,
    city: row.city,
    address: row.address,
    notes: row.notes,
    items: JSON.parse(row.items) as OrderLine[],
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function withVariants(db: D1Database, rows: ProductRow[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const placeholders = rows.map(() => '?').join(',');
  const { results } = await db
    .prepare(`SELECT * FROM variants WHERE product_id IN (${placeholders}) ORDER BY position, id`)
    .bind(...rows.map((row) => row.id))
    .all<VariantRow>();
  return rows.map((row) => toProduct(row, results));
}

export async function listAllProducts(db: D1Database): Promise<Product[]> {
  const { results } = await db
    .prepare('SELECT * FROM products ORDER BY is_featured DESC, created_at DESC, id DESC')
    .all<ProductRow>();
  return withVariants(db, results);
}

export async function searchProducts(db: D1Database, filters: CatalogFilters): Promise<{ products: Product[]; total: number }> {
  const { where, params, orderBy } = buildCatalogQuery(filters);
  const offset = (filters.page - 1) * PAGE_SIZE;

  const [rows, count] = await db.batch<ProductRow | { total: number }>([
    db.prepare(`SELECT * FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...params, PAGE_SIZE, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM products ${where}`).bind(...params),
  ]);

  const products = await withVariants(db, rows.results as ProductRow[]);
  return { products, total: (count.results[0] as { total: number }).total };
}

const HOME_SECTION_WHERE: Record<HomeSection, string> = {
  featured: 'is_featured = 1',
  new: 'is_new = 1',
  sale: 'compare_at_price IS NOT NULL',
};

export async function listHomeSection(db: D1Database, section: HomeSection, limit: number): Promise<Product[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM products WHERE is_active = 1 AND ${HOME_SECTION_WHERE[section]} ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .bind(limit)
    .all<ProductRow>();
  return withVariants(db, results);
}

export async function listLatestProducts(db: D1Database, limit: number): Promise<Product[]> {
  const { results } = await db
    .prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC, id DESC LIMIT ?')
    .bind(limit)
    .all<ProductRow>();
  return withVariants(db, results);
}

export async function listCategories(db: D1Database): Promise<Category[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.slug, c.name, c.position, COUNT(p.id) AS product_count
       FROM categories c LEFT JOIN products p ON p.category = c.slug
       GROUP BY c.id ORDER BY c.position, c.name`,
    )
    .all<{ id: number; slug: string; name: string; position: number; product_count: number }>();
  return results.map((row) => ({ id: row.id, slug: row.slug, name: row.name, position: row.position, productCount: row.product_count }));
}

export async function createCategory(db: D1Database, name: string, position: number): Promise<void> {
  const base = slugify(name);
  const { results } = await db
    .prepare('SELECT slug FROM categories WHERE slug = ? OR slug LIKE ?')
    .bind(base, `${base}-%`)
    .all<{ slug: string }>();
  const slug = uniqueSlug(base, results.map((row) => row.slug));
  await db.prepare('INSERT INTO categories (slug, name, position) VALUES (?, ?, ?)').bind(slug, name, position).run();
}

// The slug never changes on rename so products and shared filter links keep working
export async function updateCategory(db: D1Database, id: number, name: string, position: number): Promise<void> {
  await db.prepare('UPDATE categories SET name = ?, position = ? WHERE id = ?').bind(name, position, id).run();
}

export async function deleteCategory(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
}

export async function getProductBySlug(db: D1Database, slug: string): Promise<Product | null> {
  const row = await db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').bind(slug).first<ProductRow>();
  if (!row) return null;
  const [product] = await withVariants(db, [row]);
  return product;
}

export async function getProductById(db: D1Database, id: number): Promise<Product | null> {
  const row = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!row) return null;
  const [product] = await withVariants(db, [row]);
  return product;
}

function productValues(input: ProductInput) {
  return [
    input.title,
    input.category,
    input.price,
    input.compareAtPrice,
    input.shortDescription,
    input.howToUse,
    input.specs,
    input.warranty,
    input.videoUrl,
    input.tags.join(','),
    JSON.stringify(input.images),
    input.isActive ? 1 : 0,
    input.isFeatured ? 1 : 0,
    input.isNew ? 1 : 0,
  ];
}

export async function createProduct(db: D1Database, input: ProductInput): Promise<number> {
  const base = slugify(input.title);
  const { results } = await db
    .prepare('SELECT slug FROM products WHERE slug = ? OR slug LIKE ?')
    .bind(base, `${base}-%`)
    .all<{ slug: string }>();
  const slug = uniqueSlug(base, results.map((row) => row.slug));

  // Variants reference the product by slug so everything runs in one atomic batch
  const insertProduct = db
    .prepare(
      `INSERT INTO products (title, category, price, compare_at_price, short_description, how_to_use, specs, warranty,
        video_url, tags, images, is_active, is_featured, is_new, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(...productValues(input), slug);
  const insertVariants = input.variants.map((variant, position) =>
    db
      .prepare(
        `INSERT INTO variants (product_id, color_name, color_hex, image_key, stock, position)
         VALUES ((SELECT id FROM products WHERE slug = ?), ?, ?, ?, ?, ?)`,
      )
      .bind(slug, variant.colorName, variant.colorHex, variant.imageKey, variant.stock, position),
  );
  await db.batch([insertProduct, ...insertVariants]);

  const created = await db.prepare('SELECT id FROM products WHERE slug = ?').bind(slug).first<{ id: number }>();
  return created!.id;
}

// The slug stays fixed after creation so links already shared on WhatsApp keep working
export async function updateProduct(db: D1Database, id: number, input: ProductInput): Promise<void> {
  const { results } = await db.prepare('SELECT id FROM variants WHERE product_id = ?').bind(id).all<{ id: number }>();
  const existingIds = new Set(results.map((row) => row.id));
  const keptIds = new Set(input.variants.map((variant) => variant.id).filter((variantId) => variantId !== null));

  const updateStatement = db
    .prepare(
      `UPDATE products SET title = ?, category = ?, price = ?, compare_at_price = ?, short_description = ?, how_to_use = ?,
        specs = ?, warranty = ?, video_url = ?, tags = ?, images = ?, is_active = ?, is_featured = ?, is_new = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(...productValues(input), id);

  const deleteStatements = [...existingIds]
    .filter((variantId) => !keptIds.has(variantId))
    .map((variantId) => db.prepare('DELETE FROM variants WHERE id = ?').bind(variantId));

  const upsertStatements = input.variants.map((variant, position) => {
    if (variant.id !== null && existingIds.has(variant.id)) {
      return db
        .prepare('UPDATE variants SET color_name = ?, color_hex = ?, image_key = ?, stock = ?, position = ? WHERE id = ?')
        .bind(variant.colorName, variant.colorHex, variant.imageKey, variant.stock, position, variant.id);
    }
    return db
      .prepare('INSERT INTO variants (product_id, color_name, color_hex, image_key, stock, position) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, variant.colorName, variant.colorHex, variant.imageKey, variant.stock, position);
  });

  await db.batch([updateStatement, ...deleteStatements, ...upsertStatements]);
}

export async function deleteProduct(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
}

export async function getVariantsForOrder(db: D1Database, variantIds: number[]): Promise<VariantForOrder[]> {
  if (variantIds.length === 0) return [];
  const placeholders = variantIds.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT v.id AS variant_id, p.title, v.color_name, p.price, v.stock, p.is_active
       FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id IN (${placeholders})`,
    )
    .bind(...variantIds)
    .all<{ variant_id: number; title: string; color_name: string; price: number; stock: number; is_active: number }>();

  return results.map((row) => ({
    variantId: row.variant_id,
    title: row.title,
    colorName: row.color_name,
    price: row.price,
    stock: row.stock,
    isActive: row.is_active === 1,
  }));
}

export async function createOrder(
  db: D1Database,
  order: { customerName: string; city: string; address: string; notes: string; items: OrderLine[]; total: number },
): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO orders (customer_name, city, address, notes, items, total, privacy_accepted_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now')) RETURNING id`,
    )
    .bind(order.customerName, order.city, order.address, order.notes, JSON.stringify(order.items), order.total)
    .first<{ id: number }>();
  return row!.id;
}

export async function listOrders(db: D1Database, status?: OrderStatus): Promise<Order[]> {
  const statement = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT 200').bind(status)
    : db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200');
  const { results } = await statement.all<OrderRow>();
  return results.map(toOrder);
}

export async function getOrder(db: D1Database, id: number): Promise<Order | null> {
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
  return row ? toOrder(row) : null;
}

export async function setOrderStatus(
  db: D1Database,
  id: number,
  status: OrderStatus,
  changes: { variantId: number; delta: number }[],
): Promise<void> {
  // MAX(...) guards against stock going negative if a variant was edited after the order was placed
  const stockStatements = changes.map((change) =>
    db.prepare('UPDATE variants SET stock = MAX(stock + ?, 0) WHERE id = ?').bind(change.delta, change.variantId),
  );
  await db.batch([db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, id), ...stockStatements]);
}

export interface ActivityEntry {
  id: number;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export async function logActivity(db: D1Database, actor: string, action: string, target: string): Promise<void> {
  await db.prepare('INSERT INTO activity_log (actor, action, target) VALUES (?, ?, ?)').bind(actor, action, target).run();
}

export async function listActivity(db: D1Database, limit: number): Promise<ActivityEntry[]> {
  const { results } = await db
    .prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?')
    .bind(limit)
    .all<{ id: number; actor: string; action: string; target: string; created_at: string }>();
  return results.map((row) => ({ id: row.id, actor: row.actor, action: row.action, target: row.target, createdAt: row.created_at }));
}

export async function countRecentOrderAttempts(db: D1Database, ipHash: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS total FROM order_attempts WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')")
    .bind(ipHash)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

// Old fingerprints are deleted on every insert, so the table never keeps more than the last hour
export async function recordOrderAttempt(db: D1Database, ipHash: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM order_attempts WHERE created_at <= datetime('now', '-1 hour')"),
    db.prepare('INSERT INTO order_attempts (ip_hash) VALUES (?)').bind(ipHash),
  ]);
}

export interface DashboardStats {
  pendingOrders: number;
  activeProducts: number;
  hiddenProducts: number;
  soldOutProducts: number;
}

export interface LowStockItem {
  productId: number;
  title: string;
  colorName: string;
  stock: number;
}

export async function getDashboardStats(db: D1Database): Promise<DashboardStats> {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
        (SELECT COUNT(*) FROM products WHERE is_active = 1) AS active_products,
        (SELECT COUNT(*) FROM products WHERE is_active = 0) AS hidden_products,
        (SELECT COUNT(*) FROM products p WHERE p.is_active = 1
          AND NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0)) AS sold_out_products`,
    )
    .first<{ pending_orders: number; active_products: number; hidden_products: number; sold_out_products: number }>();

  return {
    pendingOrders: row?.pending_orders ?? 0,
    activeProducts: row?.active_products ?? 0,
    hiddenProducts: row?.hidden_products ?? 0,
    soldOutProducts: row?.sold_out_products ?? 0,
  };
}

export async function listLowStock(db: D1Database, threshold: number): Promise<LowStockItem[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id AS product_id, p.title, v.color_name, v.stock
       FROM variants v JOIN products p ON p.id = v.product_id
       WHERE p.is_active = 1 AND v.stock BETWEEN 1 AND ?
       ORDER BY v.stock, p.title LIMIT 20`,
    )
    .bind(threshold)
    .all<{ product_id: number; title: string; color_name: string; stock: number }>();
  return results.map((row) => ({ productId: row.product_id, title: row.title, colorName: row.color_name, stock: row.stock }));
}

export async function listUsedImageKeys(db: D1Database): Promise<Set<string>> {
  const [products, variants] = await db.batch<{ images?: string; image_key?: string }>([
    db.prepare('SELECT images FROM products'),
    db.prepare("SELECT image_key FROM variants WHERE image_key != ''"),
  ]);
  const keys = new Set<string>();
  for (const row of products.results) for (const key of JSON.parse(row.images ?? '[]') as string[]) keys.add(key);
  for (const row of variants.results) keys.add(row.image_key!);
  return keys;
}
