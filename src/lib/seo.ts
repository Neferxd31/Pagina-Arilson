import type { Product } from './db';
import { jsonForScript } from './format';

const SITEMAP_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildSitemap(urls: { loc: string; lastmod?: string }[]): string {
  const entries = urls.map((url) => {
    const lastmod = url.lastmod ? `<lastmod>${escapeXml(url.lastmod)}</lastmod>` : '';
    return `  <url><loc>${escapeXml(url.loc)}</loc>${lastmod}</url>`;
  });
  return `${SITEMAP_HEADER}\n${entries.join('\n')}\n</urlset>\n`;
}

// El admin, la API y el carrito no tienen nada que buscar en Google
export function buildRobotsTxt(origin: string): string {
  return ['User-agent: *', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /carrito', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}

// schema.org Product: lets Google show price and availability in search results
export function productJsonLd(product: Product, options: { origin: string; imageUrls: string[] }): string {
  const inStock = product.variants.some((variant) => variant.stock > 0);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription || undefined,
    image: options.imageUrls.length > 0 ? options.imageUrls : undefined,
    brand: { '@type': 'Brand', name: 'EsencialesCol' },
    offers: {
      '@type': 'Offer',
      url: `${options.origin}/p/${product.slug}`,
      priceCurrency: 'COP',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  return jsonForScript(data);
}
