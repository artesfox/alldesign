# All Design Cocinas Integrales – sitio en Astro

Migración de https://alldesign.com.co (WordPress + Divi) a Astro.

## Publicar en Cloudflare Pages

1. Sube esta carpeta a un repositorio nuevo de GitHub (por ejemplo `all-design-cocinas`).
2. En Cloudflare: **Workers & Pages → Crear → Pages → Conectar con Git** y elige el repositorio.
3. En **Framework preset** elige **Astro**. Cloudflare llena solo:
   - Comando de build: `npm run build`
   - Carpeta de salida: `dist`
4. Guarda y publica. Quedará en `all-design-cocinas.pages.dev`.

No necesitas instalar nada en tu computador: Cloudflare construye el sitio cada vez que subes cambios a GitHub.

> Opcional, para verlo en tu computador antes de subirlo: `npm install` y luego `npm run dev`.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Textos del inicio, teléfonos, correo, redes, carrusel | `src/data/sitio.json` |
| Cocinas integrales | `src/data/cocinas.json` |
| Otros productos | `src/data/productos.json` |
| Promociones (precio y precio con descuento; el % se calcula solo) | `src/data/promociones.json` |
| Entradas del blog | `src/data/blog.json` |
| Nosotros, Garantía, Materiales, texto de Cocinas | `src/data/paginas.json` |
| Fotos (WebP optimizadas) y miniaturas | `public/uploads/` y `public/uploads/mini/` |
| Estilos | `src/styles/global.css` |
| Menú, carrusel, galerías y visor de fotos | `public/js/sitio.js` y `public/js/galerias.js` |
| Lectura de datos (lo único que cambia en la etapa 2) | `src/lib/datos.ts` |

## Direcciones

Se mantienen las mismas URLs de WordPress para no perder el posicionamiento en Google:
`/concinas-integrales/…`, `/productos/…`, `/promociones/…`, `/blog/`, `/hacerca-de/`,
`/garantia/`, `/materiales/`, `/contacto/` y las entradas del blog en la raíz (`/nombre-entrada/`).

## Etapa 2 (próxima): panel de administración

- Base de datos **D1** con las mismas tablas que los archivos JSON (sitio, cocinas, productos, promociones, entradas).
- Fotos en **R2**, comprimidas en el navegador antes de subir.
- Panel `/admin` con login: resumen (cantidad de cocinas, promociones, productos y entradas) y secciones para
  editar inicio e información, cocinas, promociones, otros productos y entradas (publicar, editar y borrar).
- Se agregará el adaptador `@astrojs/cloudflare` con `output: 'server'`.
