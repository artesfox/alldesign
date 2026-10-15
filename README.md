# All Design Cocinas Integrales – sitio en Astro + panel de administración

Migración de https://alldesign.com.co (WordPress + Divi) a Astro en Cloudflare Pages.
El contenido se guarda en una base de datos **D1** y las fotos nuevas en **R2**.
El cliente lo actualiza desde **/admin**.

---

## Configuración en Cloudflare (una sola vez)

Haz estos pasos **antes** de subir esta versión a GitHub.

### 1. Crear la base de datos (D1)
**Almacenamiento y bases de datos → D1 → Crear base de datos**
- Nombre: `alldesign-db`

### 2. Crear el almacenamiento de fotos (R2)
**Almacenamiento y bases de datos → R2 → Crear bucket**
- Nombre: `alldesign-fotos`
- La primera vez Cloudflare puede pedir activar R2 con un método de pago. Los primeros 10 GB son gratis.

### 3. Conectar ambos al proyecto
**Workers y Pages → alldesigncocinas → Configuración → Vinculaciones → Agregar**

| Tipo | Nombre de la variable | Valor |
|---|---|---|
| Base de datos D1 | `DB` | `alldesign-db` |
| Bucket de R2 | `FOTOS` | `alldesign-fotos` |

### 4. Usuario y contraseña del panel
**Configuración → Variables y secretos → Agregar** (en *Producción*):

| Nombre | Tipo | Valor |
|---|---|---|
| `ADMIN_USUARIO` | Texto | el usuario, por ejemplo `patricia` |
| `ADMIN_CLAVE` | **Secreto** | una contraseña segura (12+ caracteres) |
| `SESION_SECRETO` | **Secreto** | 40 letras y números al azar (nadie necesita recordarlo) |

### 5. Marca de compatibilidad
**Configuración → Tiempo de ejecución → Marcas de compatibilidad**: agrega `nodejs_compat`.

### 6. Publicar
Sube los archivos a GitHub. Cloudflare compila y publica solo.
(Si configuraste algo después de publicar: **Implementaciones → … → Reintentar implementación**.)

### 7. Instalar la base de datos
Entra a `https://alldesigncocinas.pages.dev/admin`, inicia sesión y pulsa **Instalar base de datos**.
Se crean las tablas y se copia todo el contenido actual. Solo se hace una vez.

---

## El panel (/admin)

- **Resumen**: cantidad de cocinas, promociones, productos y entradas, con accesos rápidos.
- **Inicio e información**: título y descripción del inicio, carrusel, teléfonos, correo, pie de página y redes.
- **Cocinas integrales / Promociones / Otros productos**: publicar, editar, borrar, ordenar y guardar como borrador.
  En promociones el % de descuento se calcula solo.
- **Entradas del blog**: título, fecha, descripción e imagen destacada.
- Las fotos se **optimizan en el navegador** (WebP de máx. 1600 px + miniatura) antes de subirse.

### Seguridad
- Usuario y contraseña viven como variables cifradas de Cloudflare, no en el código.
- Sesión firmada en una cookie segura que vence en 8 horas.
- Máximo 5 intentos fallidos cada 15 minutos por IP.
- El HTML del editor se limpia antes de guardarse (sin scripts ni eventos).
- `/admin` y `/api` no se indexan en Google.

Para **cambiar la contraseña**: edita `ADMIN_CLAVE` en Cloudflare y vuelve a implementar.

---

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Lectura de datos (D1) | `src/lib/datos.ts` |
| Guardado y validación del panel | `src/lib/admin.ts`, `src/lib/limpiar.ts` |
| Inicio de sesión | `src/lib/auth.ts`, `src/middleware.ts` |
| Páginas del panel | `src/pages/admin/` |
| API del panel | `src/pages/api/` |
| Estilos del sitio / del panel | `src/styles/global.css` / `src/styles/panel.css` |
| JavaScript del sitio / del panel | `public/js/sitio.js`, `public/js/galerias.js` / `public/js/panel.js` |
| Contenido inicial (se usa al instalar) | `src/data/*.json` |
| Textos fijos: Nosotros, Garantía, Materiales | `src/data/paginas.json` |
| Estructura de la base de datos | `base-de-datos/1-tablas.sql` (y `2-datos.sql` como respaldo) |
| Fotos migradas de WordPress | `public/uploads/` |
| Fotos subidas desde el panel | R2 → se ven en `/fotos/…` |

Se mantienen las mismas URLs de WordPress para no perder el posicionamiento en Google.
