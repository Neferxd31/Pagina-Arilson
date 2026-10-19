import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  // Product images live in R2 and are served as-is, so no image transform service is needed
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
});
