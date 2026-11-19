import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Product images live in R2 and are served as-is (imageService: 'passthrough'), so no image transform service is needed.
// El catálogo de Netlify consulta Supabase. El despliegue en Cloudflare usa D1.
const isNetlify = process.env.PREVIEW === 'netlify';

const adapter = isNetlify
  ? (await import('@astrojs/netlify')).default({ imageCDN: false, devFeatures: false })
  : cloudflare({ imageService: 'passthrough' });

const netlifyVite = {
  resolve: {
    alias: { 'cloudflare:workers': fileURLToPath(new URL('./src/preview/cloudflare-workers.ts', import.meta.url)) },
  },
  define: { 'import.meta.env.PUBLIC_CATALOG_ONLY': JSON.stringify('true') },
};

export default defineConfig({
  output: 'server',
  adapter,
  session: false,
  vite: isNetlify ? netlifyVite : {},
});
