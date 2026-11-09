// Vista previa temporal en Netlify: reemplaza el módulo `cloudflare:workers` (solo con PREVIEW=netlify).
// D1 se simula con SQLite en memoria creado desde las mismas migraciones, y se llena con productos de ejemplo.
// Los datos se reinician cada vez que Netlify arranca la función: nada de lo que pase aquí se guarda.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import initMigration from '../../migrations/0001_init.sql?raw';
import categoriesMigration from '../../migrations/0002_categories_and_sections.sql?raw';
import securityMigration from '../../migrations/0003_security_and_activity.sql?raw';
import { DEV_TEST_SECRET } from '../lib/turnstile';
import { SAMPLE_PRODUCTS, SAMPLE_TEXT } from './sample-products';

class PreviewStatement {
  constructor(
    private readonly sqlite: DatabaseSync,
    private readonly sql: string,
    private readonly params: SQLInputValue[] = [],
  ) {}

  bind(...params: SQLInputValue[]) {
    return new PreviewStatement(this.sqlite, this.sql, params);
  }

  rows() {
    return this.sqlite.prepare(this.sql).all(...this.params);
  }

  async all() {
    return { results: this.rows() };
  }

  async first() {
    return this.sqlite.prepare(this.sql).get(...this.params) ?? null;
  }

  async run() {
    this.sqlite.prepare(this.sql).run(...this.params);
    return { success: true };
  }
}

// Only the subset of the D1 API that src/lib/db.ts uses
class PreviewDatabase {
  constructor(private readonly sqlite: DatabaseSync) {}

  prepare(sql: string) {
    return new PreviewStatement(this.sqlite, sql);
  }

  async batch(statements: PreviewStatement[]) {
    this.sqlite.exec('BEGIN');
    try {
      const results = statements.map((statement) => ({ results: statement.rows() }));
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

function createSampleDatabase(): DatabaseSync {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(initMigration);
  sqlite.exec(categoriesMigration);
  sqlite.exec(securityMigration);

  const insertProduct = sqlite.prepare(
    `INSERT INTO products (slug, title, category, price, compare_at_price, short_description, how_to_use, specs, warranty,
      is_active, is_featured, is_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?) RETURNING id`,
  );
  const insertVariant = sqlite.prepare(
    'INSERT INTO variants (product_id, color_name, color_hex, stock, position) VALUES (?, ?, ?, ?, ?)',
  );

  SAMPLE_PRODUCTS.forEach((product, index) => {
    const slug = `ejemplo-${index + 1}`;
    const { id } = insertProduct.get(
      slug,
      product.title,
      product.category,
      product.price,
      product.compareAtPrice ?? null,
      SAMPLE_TEXT.short,
      SAMPLE_TEXT.long,
      SAMPLE_TEXT.long,
      SAMPLE_TEXT.short,
      product.featured ? 1 : 0,
      product.isNew ? 1 : 0,
    ) as { id: number };
    product.colors.forEach(([name, hex, stock], position) => insertVariant.run(id, name, hex, stock, position));
  });

  return sqlite;
}

export const env = {
  DB: new PreviewDatabase(createSampleDatabase()) as unknown as D1Database,
  // No photo storage in the preview: products show the logo placeholder
  MEDIA: {
    get: async () => null,
    put: async () => {
      throw new Error('La vista previa no guarda fotos');
    },
    delete: async () => undefined,
    list: async () => ({ objects: [], truncated: false }),
  } as unknown as R2Bucket,
  // Empty Access values keep /admin closed (403) in the preview
  ACCESS_TEAM_DOMAIN: '',
  ACCESS_AUD: '',
  ADMIN_EMAILS: '',
  // Cloudflare's public Turnstile test keys: always pass and show "Solo para pruebas"
  TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  TURNSTILE_SECRET_KEY: DEV_TEST_SECRET,
};
