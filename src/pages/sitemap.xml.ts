import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { listCategories, listSitemapProducts } from '../lib/db';
import { buildSitemap } from '../lib/seo';

const STATIC_PAGES = ['/', '/productos', '/nosotros', '/contacto', '/envios', '/terminos', '/privacidad'];

export const GET: APIRoute = async ({ url }) => {
  const [products, categories] = await Promise.all([listSitemapProducts(env.DB), listCategories(env.DB)]);

  const urls = [
    ...STATIC_PAGES.map((path) => ({ loc: `${url.origin}${path}` })),
    ...categories
      .filter((category) => category.productCount > 0)
      .map((category) => ({ loc: `${url.origin}/productos?categoria=${category.slug}` })),
    // D1 dates look like "2026-11-09 17:30:00"; the sitemap only needs the day
    ...products.map((product) => ({ loc: `${url.origin}/p/${product.slug}`, lastmod: product.updatedAt.slice(0, 10) })),
  ];

  return new Response(buildSitemap(urls), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
