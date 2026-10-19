import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Product images live in R2 and are served as-is (imageService: 'passthrough'), so no image transform service is needed.
// Vista previa temporal de diseño en Netlify (PREVIEW=netlify, ver netlify.toml): sin Cloudflare y con productos de ejemplo.
// Cualquier otro build es la tienda real para Cloudflare.
const isNetlifyPreview = process.env.PREVIEW === 'netlify';

// Loaded only in preview mode so the Cloudflare build never depends on the Netlify adapter
const adapter = isNetlifyPreview
  ? (await import('@astrojs/netlify')).default({ imageCDN: false, devFeatures: false })
  : cloudflare({ imageService: 'passthrough' });

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
});
