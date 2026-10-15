// @ts-check
import { defineConfig } from 'astro/config';

// Etapa 1: sitio estático.
// Etapa 2 (panel de administración): se agregará el adaptador de Cloudflare
// y `output: 'server'` para leer los datos desde la base de datos D1.
export default defineConfig({
  site: 'https://alldesign.com.co',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
