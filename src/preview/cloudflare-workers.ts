// En Netlify, SQLite permite reutilizar las consultas del catálogo que ya usa la tienda.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import initMigration from '../../migrations/0001_init.sql?raw';
import categoriesMigration from '../../migrations/0002_categories_and_sections.sql?raw';
import { MAX_ORDER_QUANTITY } from '../lib/orders';
import { CATEGORIES, loadCatalog, type CatalogRecord } from './supabase-catalog';

class PreviewStatement {
  constructor(
    private readonly database: () => Promise<DatabaseSync>,
    private readonly sql: string,
    private readonly params: SQLInputValue[] = [],
  ) {}

  bind(...params: SQLInputValue[]) {
    return new PreviewStatement(this.database, this.sql, params);
  }

  rows(sqlite: DatabaseSync) {
    return sqlite.prepare(this.sql).all(...this.params);
  }

  async all() {
    return { results: this.rows(await this.database()) };
  }

  async first() {
    return (await this.database()).prepare(this.sql).get(...this.params) ?? null;
  }

  async run() {
    (await this.database()).prepare(this.sql).run(...this.params);
    return { success: true };
  }
}

// Only the subset of the D1 API that src/lib/db.ts uses
class PreviewDatabase {
  private snapshot?: Promise<DatabaseSync>;
  private refreshAt = 0;

  private database = () => {
    if (!this.snapshot || Date.now() >= this.refreshAt) {
      this.refreshAt = Date.now() + 60_000;
      this.snapshot = loadCatalog().then(createCatalogDatabase);
    }
    return this.snapshot;
  };

  prepare(sql: string) {
    return new PreviewStatement(this.database, sql);
  }

  async batch(statements: PreviewStatement[]) {
    const sqlite = await this.database();
    sqlite.exec('BEGIN');
    try {
      const results = statements.map((statement) => ({ results: statement.rows(sqlite) }));
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

function createCatalogDatabase(products: CatalogRecord[]): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(initMigration);
  sqlite.exec(categoriesMigration);
  sqlite.exec('DELETE FROM categories; ALTER TABLE products ADD COLUMN catalog_details TEXT;');
  const insertCategory = sqlite.prepare('INSERT INTO categories (slug, name, position) VALUES (?, ?, ?)');
  Object.entries(CATEGORIES).forEach(([slug, name], position) => insertCategory.run(slug, name, position));

  const insertProduct = sqlite.prepare(
    `INSERT INTO products (id, slug, title, category, price, short_description, specs, images, is_featured, catalog_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertVariant = sqlite.prepare(
    'INSERT INTO variants (id, product_id, color_name, stock) VALUES (?, ?, ?, ?)',
  );

  for (const product of products) {
    insertProduct.run(
      product.id,
      product.slug,
      product.title,
      product.category,
      product.price ?? 0,
      product.description,
      product.note,
      JSON.stringify([`catalogo/${product.slug}.jpg`]),
      product.featured ? 1 : 0,
      JSON.stringify({ suggestedPrice: product.suggested_price, priceTiers: product.price_tiers }),
    );
    // Una variante por referencia. El máximo sirve para cotizar cantidades, no representa inventario.
    insertVariant.run(product.id, product.id, '', MAX_ORDER_QUANTITY);
  }

  return sqlite;
}

export const env = {
  DB: new PreviewDatabase() as unknown as D1Database,
  // Las imágenes del catálogo se sirven directamente como archivos estáticos.
  MEDIA: {
    get: async () => null,
    put: async () => {
      throw new Error('El catálogo de Netlify usa fotos estáticas');
    },
    delete: async () => undefined,
  } as unknown as R2Bucket,
  ACCESS_TEAM_DOMAIN: '',
  ACCESS_AUD: '',
  TURNSTILE_SITE_KEY: '',
  TURNSTILE_SECRET_KEY: undefined,
};
