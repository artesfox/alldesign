// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Etapa 2: el sitio se arma en Cloudflare en cada visita, leyendo la base de datos D1.
// Las fotos subidas desde el panel se guardan en R2.
export default defineConfig({
  site: 'https://alldesign.com.co',
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  trailingSlash: 'ignore',
  security: { checkOrigin: true },
});
