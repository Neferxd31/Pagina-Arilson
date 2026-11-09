import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';

// Product images live in R2 and are served as-is (imageService: 'passthrough'), so no image transform service is needed.
// Vista previa temporal de diseño en Netlify (PREVIEW=netlify, ver netlify.toml): sin Cloudflare y con productos de ejemplo.
// Cualquier otro build es la tienda real para Cloudflare.
const isNetlifyPreview = process.env.PREVIEW === 'netlify';

// Loaded only in preview mode so the Cloudflare build never depends on the Netlify adapter
const adapter = isNetlifyPreview
  ? (await import('@astrojs/netlify')).default({ imageCDN: false, devFeatures: false })
  : cloudflare({ imageService: 'passthrough' });

// Páginas públicas en caché de Cloudflare: menos lecturas a la base de datos y menos procesador por visita.
// Cada cambio en el admin borra la etiqueta "store" (src/lib/admin-log.ts), así que los cambios se ven al instante;
// maxAge es solo el respaldo por si ese borrado fallara.
const STORE_CACHE = { maxAge: 60, swr: 300, tags: ['store'] };
const storeCache = {
  cache: { provider: cacheCloudflare() },
  routeRules: Object.fromEntries(
    ['/', '/productos', '/p/[slug]', '/nosotros', '/contacto', '/envios', '/terminos', '/privacidad', '/sitemap.xml'].map((route) => [
      route,
      STORE_CACHE,
    ]),
  ),
};

const previewVite = {
  resolve: {
    alias: { 'cloudflare:workers': fileURLToPath(new URL('./src/preview/cloudflare-workers.ts', import.meta.url)) },
  },
  define: { 'import.meta.env.PUBLIC_PREVIEW': JSON.stringify('true') },
};

export default defineConfig({
  output: 'server',
  adapter,
  session: false,
  vite: isNetlifyPreview ? previewVite : {},
  ...(isNetlifyPreview ? {} : storeCache),
});
